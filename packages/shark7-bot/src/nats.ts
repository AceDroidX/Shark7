import { Nats, Shark7RpcSubjects, logger } from 'shark7-shared'

type AiSummaryByBvidRequest = {
    bvid: string
}

type AiSummaryByBvidResponse =
    | {
        ok: true
        bvid: string
        summaryId: number
        cached: boolean
        summaryText: string
    }
    | {
        ok: false
        bvid: string
        error: string
    }

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export async function requestVideoSummaryByBvid(bvid: string) {
    const nc = await Nats.connect()
    try {
        const payload: AiSummaryByBvidRequest = { bvid }
        const timeout = Number(process.env['AI_RPC_TIMEOUT_MS'] ?? '300000')
        const msg = await nc.request(
            Shark7RpcSubjects.AI_SUMMARY_BY_BVID,
            encoder.encode(JSON.stringify(payload)),
            { timeout },
        )
        const response = JSON.parse(decoder.decode(msg.data)) as AiSummaryByBvidResponse
        return response
    } finally {
        await nc.close()
    }
}

export function formatSummaryResponse(response: AiSummaryByBvidResponse) {
    if (!response.ok) {
        logger.warn(`AI 总结请求失败: ${response.error}`)
        return `生成总结失败：${response.error}`
    }

    const cacheLine = response.cached ? '（命中缓存）' : '（新生成）'
    return `BV：${response.bvid}\nAI 总结${cacheLine}\n\n${response.summaryText}`
}
