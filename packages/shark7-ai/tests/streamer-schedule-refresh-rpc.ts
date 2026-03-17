import { eq } from 'drizzle-orm'
import {
    Nats,
    Shark7JobSubjects,
    aiStreamerScheduleRuns,
    createPostgresClient,
    initLogger,
    logger,
    streamerScheduleEvidence,
    streamerScheduleItems,
    type AiStreamerScheduleRefreshRequest,
} from 'shark7-shared'
import { queryStreamerScheduleWindow, startAiStreamerScheduleRpcServer } from '../src/streamer-schedule/index.ts'

const encoder = new TextEncoder()

function getDefaultStreamerId() {
    const raw = process.env['SCHEDULE_DEFAULT_WEIBO_UID']?.trim() || process.env['weibo_id']?.split(',')[0]?.trim()
    if (!raw) {
        throw new Error('未配置 SCHEDULE_DEFAULT_WEIBO_UID 或 weibo_id')
    }
    const numeric = raw.startsWith('weibo:') ? raw.slice('weibo:'.length) : raw
    if (!/^\d+$/.test(numeric)) {
        throw new Error(`默认微博主播 UID 非法: ${raw}`)
    }
    return `weibo:${numeric}`
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

function buildRefreshPayload(streamerId: string): AiStreamerScheduleRefreshRequest {
    const externalUserId = Number(streamerId.replace('weibo:', ''))
    return {
        source: {
            streamerId,
            platform: 'weibo',
            externalUserId,
            screenName: '七海Nana7mi',
            sourceType: 'weibo_mblog',
            sourceId: 'mock-mblog-rpc-update-001',
            sourceUrl: 'https://weibo.com/7198559139/mock-mblog-rpc-update-001',
            sourcePublishedAt: '2026-03-17T11:41:02.000Z',
            textRaw: '要不今天还是歇了吧！明天18点先来一起看联想发布会！！',
            title: null,
            visibleType: 0,
            repostType: null,
            isTop: false,
            authorUserId: externalUserId,
            raw: {
                mock: true,
                scene: 'rpc-refresh-update',
            },
        },
    }
}

function buildCommentRefreshPayload(streamerId: string): AiStreamerScheduleRefreshRequest {
    const externalUserId = Number(streamerId.replace('weibo:', ''))
    return {
        source: {
            streamerId,
            platform: 'weibo',
            externalUserId,
            screenName: '七海Nana7mi',
            sourceType: 'weibo_comment',
            sourceId: 'mock-comment-rpc-001',
            sourceUrl: 'https://weibo.com/7198559139/mock-mblog-rpc-update-001',
            sourcePublishedAt: '2026-03-17T11:41:02.000Z',
            textRaw: '是的明天再来了！',
            authorUserId: externalUserId,
            raw: {
                mock: true,
                scene: 'rpc-refresh-comment-update',
            },
            replyCommentId: 'mock-audience-rpc-001',
            replyTextRaw: '今天真不来了吗',
            replyScreenName: '向太阳靠近的彗星_',
            conversationText: '原评论<向太阳靠近的彗星_>:\n今天真不来了吗\n回复:\n是的明天再来了！',
            mblog: {
                sourceId: 'mock-mblog-rpc-update-001',
                sourceUrl: 'https://weibo.com/7198559139/mock-mblog-rpc-update-001',
                sourcePublishedAt: '2026-03-17T10:05:03.000Z',
                textRaw: '要不今天还是歇了吧！明天18点先来一起看联想发布会！！',
                title: null,
                visibleType: 0,
                repostType: null,
                isTop: false,
                raw: {
                    mock: true,
                    scene: 'rpc-refresh-update',
                },
            },
        },
    }
}

async function waitForScheduleRuns(db: Awaited<ReturnType<typeof createPostgresClient>>['db'], streamerId: string, sourceId: string) {
    const timeoutAt = Date.now() + 120000
    while (Date.now() < timeoutAt) {
        const runs = await db.select({
            id: aiStreamerScheduleRuns.id,
            sourceId: aiStreamerScheduleRuns.sourceId,
            status: aiStreamerScheduleRuns.status,
            errorMessage: aiStreamerScheduleRuns.errorMessage,
        })
            .from(aiStreamerScheduleRuns)
            .where(eq(aiStreamerScheduleRuns.streamerId, streamerId))

        const matched = runs.filter((run) => run.sourceId === sourceId)
        const terminal = matched.find((run) => run.status === 'success' || run.status === 'failed')
        if (terminal) {
            if (terminal.status === 'failed') {
                throw new Error(terminal.errorMessage ?? '模拟微博更新任务失败')
            }
            return
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    throw new Error(`等待模拟微博更新处理超时: ${sourceId}`)
}

function printScheduleResult(response: Awaited<ReturnType<typeof queryStreamerScheduleWindow>>) {
    if (!response.ok) {
        console.log(`\n=== 日程查询失败 ===\n${response.error}`)
        return
    }

    console.log('\n=== 今天安排 ===')
    console.log(`todayLiveStatus: ${response.todayLiveStatus}`)
    console.log(response.todaySummary)
    for (const item of response.todayItems) {
        console.log(`- ${item.startDate ?? '未知日期'} ${item.timeText ?? ''} ${item.title} [${item.category}/${item.scheduleState}/${item.certainty}]`)
        if (item.summary) {
            console.log(`  summary: ${item.summary}`)
        }
        for (const source of item.sources) {
            console.log(`  source: ${source.sourceId}`)
            console.log(`  evidence: ${source.evidenceText}`)
        }
    }

    console.log(`\n=== 未来 ${response.windowDays} 天日程 ===`)
    for (const item of response.upcomingItems) {
        console.log(`- ${item.startDate ?? '未知日期'} ${item.timeText ?? ''} ${item.title} [${item.category}/${item.scheduleState}/${item.certainty}]`)
        if (item.summary) {
            console.log(`  summary: ${item.summary}`)
        }
        for (const source of item.sources) {
            console.log(`  source: ${source.sourceId}`)
            console.log(`  evidence: ${source.evidenceText}`)
        }
    }
}

export async function main() {
    initLogger('shark7-ai-schedule-refresh-rpc-test')

    const streamerId = getDefaultStreamerId()
    const mblogPayload = buildRefreshPayload(streamerId)
    const commentPayload = buildCommentRefreshPayload(streamerId)
    const nc = await Nats.connect()
    const rpcServer = await startAiStreamerScheduleRpcServer(nc)
    const { pool, db } = await createPostgresClient()

    try {
        await resetStreamerScheduleData(db, streamerId)

        console.log('=== 模拟微博正文更新输入 ===')
        console.log(`sourceId: ${mblogPayload.source.sourceId}`)
        console.log(`textRaw:\n${mblogPayload.source.textRaw}`)
        logger.info(`发送模拟微博正文更新任务: subject=${Shark7JobSubjects.AI_STREAMER_SCHEDULE_REFRESH} source=${mblogPayload.source.sourceId}`)
        nc.publish(Shark7JobSubjects.AI_STREAMER_SCHEDULE_REFRESH, encoder.encode(JSON.stringify(mblogPayload)))
        await waitForScheduleRuns(db, streamerId, mblogPayload.source.sourceId)

        console.log('\n=== 模拟微博评论更新输入 ===')
        console.log(`sourceId: ${commentPayload.source.sourceId}`)
        console.log(`textRaw:\n${commentPayload.source.textRaw}`)
        console.log(`conversation:\n${commentPayload.source.conversationText}`)
        logger.info(`发送模拟微博评论更新任务: subject=${Shark7JobSubjects.AI_STREAMER_SCHEDULE_REFRESH} source=${commentPayload.source.sourceId}`)
        nc.publish(Shark7JobSubjects.AI_STREAMER_SCHEDULE_REFRESH, encoder.encode(JSON.stringify(commentPayload)))
        await waitForScheduleRuns(db, streamerId, commentPayload.source.sourceId)

        const schedule = await queryStreamerScheduleWindow(db, streamerId, 7)
        printScheduleResult(schedule)
    } finally {
        await rpcServer.close()
        await nc.close()
        await pool.end()
    }
}

if (import.meta.main) {
    main().catch((error) => {
        logger.error(`模拟微博更新 RPC 测试异常: ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    })
}
