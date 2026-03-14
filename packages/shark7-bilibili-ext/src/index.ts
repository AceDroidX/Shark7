import { createPostgresClient, initLogger, logErrorDetail, logger, Scheduler } from 'shark7-shared'
import { scanSeriesArchivesAndSyncSubtitles } from './service.ts'
import { isBilibiliExtError } from './types.ts'

process.on('uncaughtException', function (err) {
    logErrorDetail('未捕获的错误', err)
    process.exit(1)
})

process.on('unhandledRejection', function (err) {
    logErrorDetail('未处理的 Promise 拒绝', err)
    process.exit(1)
})

function getRequiredNumberEnv(name: string) {
    const value = process.env[name]
    if (!value) {
        logger.error(`缺少环境变量 ${name}`)
        process.exit(1)
    }
    const result = Number(value)
    if (Number.isNaN(result)) {
        logger.error(`环境变量 ${name} 不是有效数字: ${value}`)
        process.exit(1)
    }
    return result
}

async function runSyncTask() {
    const userId = getRequiredNumberEnv('user_id')
    const seriesId = getRequiredNumberEnv('series_id')
    const limit = Number(process.env['sync_limit'] ?? '10')

    const { pool, db } = await createPostgresClient()
    try {
        const result = await scanSeriesArchivesAndSyncSubtitles(db, userId, seriesId, limit)
        logger.info(`扫描完成: archives=${result.archives.length} synced=${result.synced.length} skipped=${result.skipped.length} deferred=${result.deferred.length} retried=${result.retried.length} failed=${result.failed.length} retryFailed=${result.retryFailed.length}`)
        if (result.synced.length > 0) {
            logger.info(`已同步 BV: ${result.synced.map((item) => item.bvid).join(', ')}`)
        }
        if (result.skipped.length > 0) {
            logger.info(`已跳过 BV: ${result.skipped.join(', ')}`)
        }
        if (result.deferred.length > 0) {
            logger.info(`等待下次补抓 BV: ${result.deferred.map((item) => item.bvid).join(', ')}`)
        }
        if (result.retried.length > 0) {
            logger.info(`已补抓 BV: ${result.retried.map((item) => item.bvid).join(', ')}`)
        }
        if (result.failed.length > 0) {
            logger.warn(`首轮失败 BV: ${result.failed.map((item) => item.bvid).join(', ')}`)
        }
        if (result.retryFailed.length > 0) {
            logger.warn(`补抓失败 BV: ${result.retryFailed.map((item) => item.bvid).join(', ')}`)
        }
    } finally {
        await pool.end()
    }
}

export async function main() {
    initLogger('bilibili-ext')

    const interval = Number(process.env['interval'] ?? '60')
    await runSyncTask()

    const scheduler = new Scheduler()
    scheduler.addJob('syncBilibiliSeriesArchives', interval, async () => {
        await runSyncTask()
    })

    logger.info(`模块已启动: 每 ${interval} 秒同步一次直播回放字幕`)
}

if (import.meta.main) {
    main().catch((error) => {
        if (isBilibiliExtError(error)) {
            logger.error(`[${error.code}] ${error.message}`)
        } else {
            logErrorDetail('字幕抓取失败', error)
        }
        process.exit(1)
    })
}

export * from './types.ts'
export * from './client.ts'
export * from './archive.ts'
export * from './video.ts'
export * from './subtitle.ts'
export * from './service.ts'
export * from './repository.ts'
