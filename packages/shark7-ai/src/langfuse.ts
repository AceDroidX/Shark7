import { LangfuseSpanProcessor } from '@langfuse/otel'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { logger } from 'shark7-shared'

let sdk: NodeSDK | null = null

export async function initLangfuseOtel() {
    if (sdk) {
        return sdk
    }

    if (!process.env['LANGFUSE_SECRET_KEY'] || !process.env['LANGFUSE_PUBLIC_KEY']) {
        logger.warn('未配置 Langfuse Key，跳过 OTEL 初始化')
        return null
    }

    sdk = new NodeSDK({
        spanProcessors: [new LangfuseSpanProcessor()],
    })

    await sdk.start()
    logger.info('Langfuse OTEL 已启动')
    return sdk
}

export async function shutdownLangfuseOtel() {
    if (!sdk) {
        return
    }

    await sdk.shutdown()
    logger.info('Langfuse OTEL 已关闭')
    sdk = null
}
