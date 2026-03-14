import { type Msg, type NatsConnection } from '@nats-io/transport-node'
import { Shark7RpcSubjects, createPostgresClient, logger } from 'shark7-shared'
import { generateVideoSummaryByBvid } from './summary.ts'
import type { AiSummaryByBvidRequest, AiSummaryByBvidResponse } from './types.ts'

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const ActiveHandlers = new Set<Promise<void>>()

async function handleAiSummaryRequest(db: Awaited<ReturnType<typeof createPostgresClient>>['db'], msg: Msg) {
    let request: AiSummaryByBvidRequest | null = null
    try {
        request = JSON.parse(decoder.decode(msg.data)) as AiSummaryByBvidRequest
        const bvid = request.bvid?.trim()
        if (!bvid) {
            msg.respond(encoder.encode(JSON.stringify({
                ok: false,
                bvid: '',
                error: '缺少 bvid',
            } satisfies AiSummaryByBvidResponse)))
            return
        }

        const result = await generateVideoSummaryByBvid(db, bvid)
        msg.respond(encoder.encode(JSON.stringify({
            ok: true,
            bvid,
            summaryId: result.summaryId,
            cached: result.cached,
            summaryText: result.summaryText,
        } satisfies AiSummaryByBvidResponse)))
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const bvid = request?.bvid ?? ''
        logger.error(`AI 总结 RPC 失败: ${message}`)
        msg.respond(encoder.encode(JSON.stringify({
            ok: false,
            bvid,
            error: message,
        } satisfies AiSummaryByBvidResponse)))
    }
}

export async function startAiSummaryRpcServer(nc: NatsConnection) {
    const { pool, db } = await createPostgresClient()
    const sub = nc.subscribe(Shark7RpcSubjects.AI_SUMMARY_BY_BVID)
    logger.info(`订阅主题: ${Shark7RpcSubjects.AI_SUMMARY_BY_BVID}`)

    ;(async () => {
        for await (const msg of sub) {
            const handler = handleAiSummaryRequest(db, msg)
                .catch((error) => {
                    logger.error(`AI 总结处理协程异常: ${error instanceof Error ? error.message : String(error)}`)
                })
                .finally(() => {
                    ActiveHandlers.delete(handler)
                })
            ActiveHandlers.add(handler)
        }
    })()

    return {
        pool,
        sub,
        close: async () => {
            sub.unsubscribe()
            await sub.drain().catch(() => undefined)
            await Promise.allSettled([...ActiveHandlers])
            await pool.end()
        },
    }
}
