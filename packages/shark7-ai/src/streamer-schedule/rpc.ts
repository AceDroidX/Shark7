import { type Msg, type NatsConnection } from '@nats-io/transport-node'
import {
    Shark7JobSubjects,
    Shark7RpcSubjects,
    createPostgresClient,
    logger,
    type AiStreamerScheduleQueryRequest,
    type AiStreamerScheduleQueryResponse,
    type AiStreamerScheduleReanalyzeRequest,
    type AiStreamerScheduleReanalyzeResponse,
    type AiStreamerScheduleRefreshRequest,
} from 'shark7-shared'
import { queryStreamerScheduleWindow, reanalyzeStreamerScheduleWindow, refreshStreamerScheduleBySource } from './service.ts'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const ActiveHandlers = new Set<Promise<void>>()

async function handleScheduleQueryRequest(db: Awaited<ReturnType<typeof createPostgresClient>>['db'], msg: Msg) {
    let request: AiStreamerScheduleQueryRequest | null = null
    try {
        request = JSON.parse(decoder.decode(msg.data)) as AiStreamerScheduleQueryRequest
        const streamerId = request.streamerId?.trim()
        if (!streamerId) {
            msg.respond(encoder.encode(JSON.stringify({
                ok: false,
                streamerId: '',
                error: '缺少 streamerId',
            } satisfies AiStreamerScheduleQueryResponse)))
            return
        }

        const response = await queryStreamerScheduleWindow(db, streamerId, request.days ?? 7)
        msg.respond(encoder.encode(JSON.stringify(response)))
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`主播日程查询 RPC 失败: ${message}`)
        msg.respond(encoder.encode(JSON.stringify({
            ok: false,
            streamerId: request?.streamerId ?? '',
            error: message,
        } satisfies AiStreamerScheduleQueryResponse)))
    }
}

async function handleScheduleReanalyzeRequest(db: Awaited<ReturnType<typeof createPostgresClient>>['db'], msg: Msg) {
    let request: AiStreamerScheduleReanalyzeRequest | null = null
    try {
        request = JSON.parse(decoder.decode(msg.data)) as AiStreamerScheduleReanalyzeRequest
        const streamerId = request.streamerId?.trim()
        if (!streamerId) {
            msg.respond(encoder.encode(JSON.stringify({
                ok: false,
                streamerId: '',
                error: '缺少 streamerId',
            } satisfies AiStreamerScheduleReanalyzeResponse)))
            return
        }

        const response = await reanalyzeStreamerScheduleWindow(db, {
            streamerId,
            hours: request.hours,
        })
        msg.respond(encoder.encode(JSON.stringify(response)))
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`主播日程重分析 RPC 失败: ${message}`)
        msg.respond(encoder.encode(JSON.stringify({
            ok: false,
            streamerId: request?.streamerId ?? '',
            error: message,
        } satisfies AiStreamerScheduleReanalyzeResponse)))
    }
}

async function handleScheduleRefreshRequest(db: Awaited<ReturnType<typeof createPostgresClient>>['db'], msg: Msg) {
    const request = JSON.parse(decoder.decode(msg.data)) as AiStreamerScheduleRefreshRequest
    await refreshStreamerScheduleBySource(db, request.source)
}

export async function startAiStreamerScheduleRpcServer(nc: NatsConnection) {
    const { pool, db } = await createPostgresClient()
    const querySub = nc.subscribe(Shark7RpcSubjects.AI_STREAMER_SCHEDULE_QUERY)
    const reanalyzeSub = nc.subscribe(Shark7RpcSubjects.AI_STREAMER_SCHEDULE_REANALYZE)
    const refreshSub = nc.subscribe(Shark7JobSubjects.AI_STREAMER_SCHEDULE_REFRESH)
    logger.info(`订阅主题: ${Shark7RpcSubjects.AI_STREAMER_SCHEDULE_QUERY}`)
    logger.info(`订阅主题: ${Shark7RpcSubjects.AI_STREAMER_SCHEDULE_REANALYZE}`)
    logger.info(`订阅主题: ${Shark7JobSubjects.AI_STREAMER_SCHEDULE_REFRESH}`)

    ;(async () => {
        for await (const msg of querySub) {
            const handler = handleScheduleQueryRequest(db, msg)
                .catch((error) => {
                    logger.error(`主播日程查询处理异常: ${error instanceof Error ? error.message : String(error)}`)
                })
                .finally(() => {
                    ActiveHandlers.delete(handler)
                })
            ActiveHandlers.add(handler)
        }
    })()

    ;(async () => {
        for await (const msg of reanalyzeSub) {
            const handler = handleScheduleReanalyzeRequest(db, msg)
                .catch((error) => {
                    logger.error(`主播日程重分析处理异常: ${error instanceof Error ? error.message : String(error)}`)
                })
                .finally(() => {
                    ActiveHandlers.delete(handler)
                })
            ActiveHandlers.add(handler)
        }
    })()

    ;(async () => {
        for await (const msg of refreshSub) {
            const handler = handleScheduleRefreshRequest(db, msg)
                .catch((error) => {
                    logger.error(`主播日程刷新处理异常: ${error instanceof Error ? error.message : String(error)}`)
                })
                .finally(() => {
                    ActiveHandlers.delete(handler)
                })
            ActiveHandlers.add(handler)
        }
    })()

    return {
        pool,
        close: async () => {
            querySub.unsubscribe()
            reanalyzeSub.unsubscribe()
            refreshSub.unsubscribe()
            await querySub.drain().catch(() => undefined)
            await reanalyzeSub.drain().catch(() => undefined)
            await refreshSub.drain().catch(() => undefined)
            await Promise.allSettled([...ActiveHandlers])
            await pool.end()
        },
    }
}
