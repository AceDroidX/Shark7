import { Nats, Shark7RpcSubjects, initLogger, logger } from 'shark7-shared'
import type { AiSummaryByBvidRequest, AiSummaryByBvidResponse } from '../src/types.ts'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function getInputBvid() {
    return process.argv[2]?.trim()
}

export async function main() {
    initLogger('shark7-ai-test')

    const bvid = getInputBvid()
    if (!bvid) {
        logger.error('请提供要测试的 BV 号，例如：node --env-file=.env tests/rpc.ts BV1smNNzWERZ')
        process.exit(1)
    }

    const nc = await Nats.connect()
    try {
        const payload: AiSummaryByBvidRequest = { bvid }
        const timeout = Number(process.env['AI_RPC_TIMEOUT_MS'] ?? '300000')
        logger.info(`发送 NATS 请求: subject=${Shark7RpcSubjects.AI_SUMMARY_BY_BVID} bvid=${bvid}`)

        const msg = await nc.request(
            Shark7RpcSubjects.AI_SUMMARY_BY_BVID,
            encoder.encode(JSON.stringify(payload)),
            { timeout },
        )

        const response = JSON.parse(decoder.decode(msg.data)) as AiSummaryByBvidResponse
        if (!response.ok) {
            logger.error(`RPC 测试失败: ${response.error}`)
            process.exit(1)
        }

        logger.info(`RPC 测试成功: summary_id=${response.summaryId} cached=${response.cached}`)
        console.log(response.summaryText)
    } finally {
        await nc.close()
    }
}

if (import.meta.main) {
    main().catch((error) => {
        logger.error(`AI RPC 测试异常: ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    })
}
