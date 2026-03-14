import { Nats, initLogger, logErrorDetail, logger } from 'shark7-shared'
import { initLangfuseOtel, shutdownLangfuseOtel } from './langfuse.ts'
import { startAiSummaryRpcServer } from './rpc.ts'

process.on('uncaughtException', function (err) {
    logErrorDetail('未捕获的错误', err)
    process.exit(1)
})

process.on('unhandledRejection', function (err) {
    logErrorDetail('未处理的 Promise 拒绝', err)
    process.exit(1)
})

export async function main() {
    initLogger('shark7-ai')
    await initLangfuseOtel()
    const nc = await Nats.connect()
    const rpcServer = await startAiSummaryRpcServer(nc)
    logger.info('shark7-ai 已启动，等待 NATS 总结请求')

    let stopping = false

    const stop = async () => {
        if (stopping) {
            return
        }
        stopping = true
        logger.info('shark7-ai 正在关闭')
        await rpcServer.close()
        if (!nc.isClosed() && !nc.isDraining()) {
            await nc.drain()
        }
        await shutdownLangfuseOtel()
        process.exit(0)
    }

    process.once('SIGINT', () => { void stop() })
    process.once('SIGTERM', () => { void stop() })
}

if (import.meta.main) {
    main().catch((error) => {
        logErrorDetail('生成视频总结失败', error)
        process.exit(1)
    })
}

export * from './types.ts'
export * from './repository.ts'
export * from './summary.ts'
export * from './rpc.ts'
export * from './langfuse.ts'
