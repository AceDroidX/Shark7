import { createPostgresClient, initLogger, logger, streamerScheduleEvidence, streamerScheduleItems, aiStreamerScheduleRuns } from 'shark7-shared'
import { eq } from 'drizzle-orm'
import { listWeiboSourcesInWindow, queryStreamerScheduleWindow, refreshStreamerScheduleBySource } from '../src/streamer-schedule/index.ts'

function getDefaultStreamerId() {
    const raw = process.env['SCHEDULE_DEFAULT_WEIBO_UID']?.trim() || process.env['weibo_id']?.split(',')[0]?.trim()
    if (!raw) {
        throw new Error('未配置 SCHEDULE_DEFAULT_WEIBO_UID 或 weibo_id')
    }
    const numeric = raw.startsWith('weibo:') ? raw.slice('weibo:'.length) : raw
    if (!/^\d+$/.test(numeric)) {
        throw new Error(`默认微博主播 UID 非法: ${raw}`)
    }
    return {
        streamerId: `weibo:${numeric}`,
        externalUserId: Number(numeric),
    }
}

function getHours() {
    const raw = process.argv[2]?.trim()
    if (!raw) return 24
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
        throw new Error(`小时参数非法: ${raw}`)
    }
    return Math.min(Math.max(Math.floor(parsed), 1), 24 * 30)
}

function printSource(source: Awaited<ReturnType<typeof listWeiboSourcesInWindow>>[number], index: number) {
    console.log(`\n=== 微博 ${index + 1} ===`)
    console.log(`sourceId: ${source.sourceId}`)
    console.log(`sourceUrl: ${source.sourceUrl ?? 'N/A'}`)
    console.log(`publishedAt: ${source.sourcePublishedAt}`)
    console.log(`title: ${source.title ?? '(无标题)'}`)
    console.log(`textRaw:\n${source.textRaw}`)
    if (source.comments.length === 0) {
        console.log('comments: (无作者评论)')
        return
    }
    console.log('comments:')
    for (const comment of source.comments) {
        console.log(`- [${comment.createdAt}] ${comment.screenName}: ${comment.textRaw}`)
        if (comment.replyTextRaw) {
            console.log(`  reply_to<${comment.replyScreenName ?? 'unknown'}>: ${comment.replyTextRaw}`)
        }
        if (comment.conversationText && comment.conversationText !== comment.textRaw) {
            console.log(`  conversation:\n${comment.conversationText}`)
        }
    }
}

function printScheduleResult(response: Awaited<ReturnType<typeof queryStreamerScheduleWindow>>) {
    if (!response.ok) {
        console.log(`\n=== 日程查询失败 ===\n${response.error}`)
        return
    }

    console.log('\n=== 今天安排 ===')
    console.log(`todayLiveStatus: ${response.todayLiveStatus}`)
    console.log(response.todaySummary)
    if (response.todayItems.length === 0) {
        console.log('- 今天暂无公开安排')
    } else {
        for (const item of response.todayItems) {
            console.log(`- ${item.startDate ?? '未知日期'} ${item.timeText ?? ''} ${item.title} [${item.category}/${item.scheduleState}/${item.certainty}]`)
            if (item.summary) {
                console.log(`  summary: ${item.summary}`)
            }
            for (const source of item.sources) {
                console.log(`  source: ${source.sourceId} ${source.sourceUrl ?? ''}`.trim())
                console.log(`  evidence: ${source.evidenceText}`)
            }
        }
    }

    console.log(`\n=== 未来 ${response.windowDays} 天日程 ===`)
    if (response.upcomingItems.length === 0) {
        console.log('- 暂无更多公开安排')
    } else {
        for (const item of response.upcomingItems) {
            console.log(`- ${item.startDate ?? '未知日期'} ${item.timeText ?? ''} ${item.title} [${item.category}/${item.scheduleState}/${item.certainty}]`)
            if (item.summary) {
                console.log(`  summary: ${item.summary}`)
            }
            for (const source of item.sources) {
                console.log(`  source: ${source.sourceId} ${source.sourceUrl ?? ''}`.trim())
                console.log(`  evidence: ${source.evidenceText}`)
            }
        }
    }
}

async function resetStreamerScheduleData(db: Awaited<ReturnType<typeof createPostgresClient>>['db'], streamerId: string) {
    const items = await db.select({ id: streamerScheduleItems.id })
        .from(streamerScheduleItems)
        .where(eq(streamerScheduleItems.streamerId, streamerId))

    for (const item of items) {
        await db.delete(streamerScheduleEvidence).where(eq(streamerScheduleEvidence.itemId, item.id))
    }

    await db.delete(streamerScheduleItems).where(eq(streamerScheduleItems.streamerId, streamerId))
    await db.delete(aiStreamerScheduleRuns).where(eq(aiStreamerScheduleRuns.streamerId, streamerId))
}

export async function main() {
    initLogger('shark7-ai-schedule-reanalyze-test')

    const { streamerId, externalUserId } = getDefaultStreamerId()
    const hours = getHours()
    const to = new Date()
    const from = new Date(to.getTime() - hours * 60 * 60 * 1000)
    const { pool, db } = await createPostgresClient()

    try {
        logger.info(`开始测试主播日程重分析: streamer=${streamerId} hours=${hours}`)
        await resetStreamerScheduleData(db, streamerId)
        const sources = await listWeiboSourcesInWindow({ externalUserId, from, to })
        console.log(`时间范围: ${from.toISOString()} ~ ${to.toISOString()}`)
        console.log(`命中微博数量: ${sources.length}`)

        let refreshed = 0
        let skipped = 0
        let appliedOperations = 0
        const failed: string[] = []

        for (const [index, source] of sources.entries()) {
            printSource(source, index)
            try {
                const result = await refreshStreamerScheduleBySource(db, source)
                if (result.skipped) {
                    skipped += 1
                    console.log(`result: skipped runId=${result.runId ?? 'null'}`)
                } else {
                    refreshed += 1
                    appliedOperations += result.appliedOperations
                    console.log(`result: refreshed runId=${result.runId ?? 'null'} appliedOperations=${result.appliedOperations}`)
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                failed.push(`${source.sourceId}: ${message}`)
                console.log(`result: failed ${message}`)
            }
        }

        console.log('\n=== 重分析统计 ===')
        console.log(`refreshed: ${refreshed}`)
        console.log(`skipped: ${skipped}`)
        console.log(`appliedOperations: ${appliedOperations}`)
        if (failed.length > 0) {
            console.log(`failed:\n- ${failed.join('\n- ')}`)
        }

        const schedule = await queryStreamerScheduleWindow(db, streamerId, 7)
        printScheduleResult(schedule)
    } finally {
        await pool.end()
    }
}

if (import.meta.main) {
    main().catch((error) => {
        logger.error(`主播日程重分析测试异常: ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    })
}
