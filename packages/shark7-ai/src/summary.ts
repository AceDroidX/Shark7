import { createHash } from 'node:crypto'
import { ChatDeepSeek } from '@langchain/deepseek'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { LogLevel, logger as LangfuseLoggerSingleton } from '@langfuse/core'
import { CallbackHandler } from '@langfuse/langchain'
import { logger, type Shark7PgDatabase } from 'shark7-shared'
import { AiSummaryRepository } from './repository.ts'
import type { SummaryChunkResult, VideoSummaryResult, VideoTranscript } from './types.ts'

const PromptVersion = 'v1'
const DefaultModel = process.env['DEEPSEEK_MODEL'] ?? 'deepseek-chat'
const MaxChunkChars = Number(process.env['SUMMARY_CHUNK_CHARS'] ?? '12000')
const MaxSummaryTokens = Number(process.env['SUMMARY_MAX_TOKENS'] ?? '2048')
const RunningSummaryTimeoutMinutes = Number(process.env['SUMMARY_RUNNING_TIMEOUT_MINUTES'] ?? '30')

let isLangfuseLoggerConfigured = false

function splitText(source: string, chunkSize: number) {
    if (source.length <= chunkSize) return [source]
    const result: string[] = []
    let cursor = 0
    while (cursor < source.length) {
        result.push(source.slice(cursor, cursor + chunkSize))
        cursor += chunkSize
    }
    return result
}

function buildInputHash(video: VideoTranscript) {
    const hash = createHash('sha256')
    hash.update(JSON.stringify({
        videoId: video.videoId,
        bvid: video.bvid,
        title: video.title,
        pages: video.pages.map((page) => ({
            pageId: page.pageId,
            pageNo: page.pageNo,
            cid: page.cid,
            trackId: page.trackId,
            segmentCount: page.segmentCount,
            textHash: createHash('sha256').update(page.text).digest('hex'),
        })),
        promptVersion: PromptVersion,
        model: DefaultModel,
    }))
    return hash.digest('hex')
}

function configureLangfuseLogger() {
    if (isLangfuseLoggerConfigured) return
    if (!process.env['LANGFUSE_SECRET_KEY'] || !process.env['LANGFUSE_PUBLIC_KEY']) return

    LangfuseLoggerSingleton.configure({
        level: LogLevel.DEBUG,
        prefix: 'Langfuse SDK',
        enableTimestamp: true,
    })
    isLangfuseLoggerConfigured = true
    logger.info('已开启 Langfuse SDK 调试日志')
}

function createCallbacks(bvid: string) {
    if (!process.env['LANGFUSE_SECRET_KEY'] || !process.env['LANGFUSE_PUBLIC_KEY']) {
        return undefined
    }
    configureLangfuseLogger()
    return [new CallbackHandler({
        sessionId: bvid,
        tags: ['shark7-ai', 'bilibili-summary'],
        traceMetadata: { bvid },
    })]
}

function createModel() {
    return new ChatDeepSeek({
        apiKey: process.env['DEEPSEEK_API_KEY'],
        model: DefaultModel,
        temperature: 0.2,
        maxTokens: MaxSummaryTokens,
    })
}

async function invokeSummaryModel(input: {
    system: string
    user: string
    bvid: string
    logLabel: string
}) {
    const model = createModel()
    logger.info(`开始调用模型: ${input.logLabel}`)
    const response = await model.invoke([
        new SystemMessage(input.system),
        new HumanMessage(input.user),
    ], {
        callbacks: createCallbacks(input.bvid),
    })
    logger.info(`模型调用完成: ${input.logLabel}`)

    if (typeof response.content === 'string') {
        return response.content.trim()
    }
    return JSON.stringify(response.content)
}

async function summarizePageTranscript(video: VideoTranscript, page: VideoTranscript['pages'][number]): Promise<SummaryChunkResult> {
    const chunks = splitText(page.text, MaxChunkChars)
    const chunkSummaries: string[] = []
    logger.info(`开始总结分P: BV=${video.bvid} P${page.pageNo} chunks=${chunks.length} chars=${page.text.length} segments=${page.segmentCount}`)

    for (const [index, chunk] of chunks.entries()) {
        logger.info(`处理分块进度: BV=${video.bvid} P${page.pageNo} chunk=${index + 1}/${chunks.length}`)
        const summary = await invokeSummaryModel({
            bvid: video.bvid,
            logLabel: `BV=${video.bvid} P${page.pageNo} chunk=${index + 1}/${chunks.length}`,
            system: '你是直播回放字幕总结助手。字幕可能存在识别错误，请在总结时适当纠正明显口误和乱码，但不要虚构没有出现过的事实。请用中文输出简洁总结。',
            user: `请总结以下直播回放字幕片段，输出 3-5 条中文要点，保留关键信息、话题、游戏进度、情绪变化和可回看的片段。\n\n视频标题：${video.title}\n分P：P${page.pageNo} ${page.part}\n片段序号：${index + 1}/${chunks.length}\n\n字幕内容：\n${chunk}`,
        })
        chunkSummaries.push(summary)
    }

    if (chunkSummaries.length === 1) {
        return {
            pageNo: page.pageNo,
            summary: chunkSummaries[0],
            chunkCount: 1,
        }
    }

    const merged = await invokeSummaryModel({
        bvid: video.bvid,
        logLabel: `BV=${video.bvid} P${page.pageNo} merge`,
        system: '你是直播回放字幕总结助手。请将多个分段总结合并为该分P的最终总结，避免重复，保留重点。请用中文输出 4-6 条要点。',
        user: `请整合以下同一分P的多个总结：\n\n视频标题：${video.title}\n分P：P${page.pageNo} ${page.part}\n\n${chunkSummaries.map((item, index) => `片段 ${index + 1}:\n${item}`).join('\n\n')}`,
    })

    logger.info(`完成分P总结: BV=${video.bvid} P${page.pageNo}`)

    return {
        pageNo: page.pageNo,
        summary: merged,
        chunkCount: chunkSummaries.length,
    }
}

async function summarizeWholeVideo(video: VideoTranscript, pageSummaries: SummaryChunkResult[]) {
    return invokeSummaryModel({
        bvid: video.bvid,
        logLabel: `BV=${video.bvid} final-summary`,
        system: '你是直播回放总结助手。请根据各分P总结生成一份适合直接发给用户的中文总结。请输出：1) 一段总体概述；2) 4-8 条关键看点；3) 如能识别则列出值得回看的时间点或分P。不要输出 JSON。',
        user: `请总结以下直播回放：\n\n标题：${video.title}\nBV：${video.bvid}\nUP主：${video.ownerName}\n\n分P总结：\n${pageSummaries.map((item) => `P${item.pageNo}:\n${item.summary}`).join('\n\n')}`,
    })
}

export async function generateVideoSummaryByBvid(db: Shark7PgDatabase, bvid: string): Promise<VideoSummaryResult> {
    const repository = new AiSummaryRepository(db)
    const transcript = await repository.getVideoTranscriptByBvid(bvid)
    if (!transcript) {
        throw new Error(`数据库中未找到 BV ${bvid} 的可用字幕`) 
    }

    const inputHash = buildInputHash(transcript)
    const cached = await repository.findSuccessfulFullSummary(transcript.videoId, inputHash)
    if (cached?.summaryText) {
        logger.info(`命中已缓存总结: ${bvid}`)
        return {
            summaryId: cached.id,
            videoId: transcript.videoId,
            bvid: transcript.bvid,
            inputHash,
            summaryText: cached.summaryText,
            pageSummaries: Array.isArray(cached.summaryJson?.['pageSummaries'])
                ? cached.summaryJson['pageSummaries'] as SummaryChunkResult[]
                : [],
            cached: true,
        }
    }

    const running = await repository.findRunningFullSummary(transcript.videoId, inputHash)
    if (running) {
        const startedAt = running.startedAt ?? running.createdAt
        const elapsedMs = startedAt ? Date.now() - startedAt.getTime() : 0
        if (elapsedMs < RunningSummaryTimeoutMinutes * 60 * 1000) {
            throw new Error(`BV ${bvid} 的总结正在生成中，请稍后重试`) 
        }

        logger.warn(`发现超时未完成的 running 总结，自动标记失败: summary_id=${running.id} bvid=${bvid}`)
        await repository.markSummaryFailedById(running.id, '总结生成超时，已自动标记失败并允许重新生成')
    }

    let summaryId = await repository.createRunningSummary({
        videoId: transcript.videoId,
        inputHash,
        modelName: DefaultModel,
        promptVersion: PromptVersion,
    })

    if (!summaryId) {
        const latest = await repository.findLatestFullSummary(transcript.videoId, inputHash)
        if (!latest) {
            throw new Error(`BV ${bvid} 的总结任务创建失败，且未找到现有记录`)
        }

        if (latest.status === 'success' && latest.summaryText) {
            logger.info(`命中最新缓存总结: ${bvid}`)
            return {
                summaryId: latest.id,
                videoId: transcript.videoId,
                bvid: transcript.bvid,
                inputHash,
                summaryText: latest.summaryText,
                pageSummaries: Array.isArray(latest.summaryJson?.['pageSummaries'])
                    ? latest.summaryJson['pageSummaries'] as SummaryChunkResult[]
                    : [],
                cached: true,
            }
        }

        if (latest.status === 'running') {
            const startedAt = latest.startedAt ?? latest.createdAt
            const elapsedMs = startedAt ? Date.now() - startedAt.getTime() : 0
            if (elapsedMs < RunningSummaryTimeoutMinutes * 60 * 1000) {
                throw new Error(`BV ${bvid} 的总结正在生成中，请稍后重试`)
            }

            logger.warn(`发现超时未完成的 running 总结，自动标记失败: summary_id=${latest.id} bvid=${bvid}`)
            await repository.markSummaryFailedById(latest.id, '总结生成超时，已自动标记失败并允许重新生成')
        }

        summaryId = await repository.reclaimFailedFullSummary({
            videoId: transcript.videoId,
            inputHash,
            modelName: DefaultModel,
            promptVersion: PromptVersion,
        })

        if (!summaryId) {
            throw new Error(`BV ${bvid} 的总结任务已由其他请求接管，请稍后重试`)
        }
    }

    logger.info(`开始生成视频总结: BV=${bvid} summary_id=${summaryId} pages=${transcript.pages.length}`)

    try {
        const pageSummaries: SummaryChunkResult[] = []
        for (const page of transcript.pages) {
            pageSummaries.push(await summarizePageTranscript(transcript, page))
        }

        const summaryText = await summarizeWholeVideo(transcript, pageSummaries)
        await repository.markSummarySuccess(summaryId, summaryText, {
            bvid: transcript.bvid,
            title: transcript.title,
            ownerName: transcript.ownerName,
            promptVersion: PromptVersion,
            model: DefaultModel,
            pageSummaries,
        })
        logger.info(`视频总结生成完成: BV=${bvid} summary_id=${summaryId}`)

        return {
            summaryId,
            videoId: transcript.videoId,
            bvid: transcript.bvid,
            inputHash,
            summaryText,
            pageSummaries,
            cached: false,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`视频总结生成失败: BV=${bvid} summary_id=${summaryId} error=${message}`)
        await repository.markSummaryFailed(summaryId, message)
        throw error
    }
}
