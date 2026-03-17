import http from '@cordisjs/plugin-http'
import qq from '@koishijs/plugin-adapter-qq'
import { Context } from '@koishijs/core'
import type { Session } from 'koishi'
import Logger from 'reggol'
import { initLogger, logger } from 'shark7-shared'
import { formatSummaryResponse, requestVideoSummaryByBvid } from './nats.ts'
import { formatStreamerScheduleReanalyzeResponse, formatStreamerScheduleResponse, requestStreamerSchedule, requestStreamerScheduleReanalyze } from './streamer-schedule.ts'

function configureKoishiLogger() {
    Logger.levels.base = Logger.DEBUG
    if (Logger.targets[0]) {
        Logger.targets[0].showTime = 'yyyy-MM-dd hh:mm:ss'
        Logger.targets[0].showDiff = false
    }
}

function createContext() {
    const ctx = new Context()
    const defaultIntents = {
        public: 0 | 1 << 25,
        private: 0 | 1 << 25,
    } as const

    ctx.plugin(http as any)

    const qqId = process.env['QQ_APP_ID']
    const qqSecret = process.env['QQ_SECRET']
    const qqToken = process.env['QQ_TOKEN']
    const qqType = process.env['QQ_TYPE'] === 'private' ? 'private' : 'public'
    const qqSandbox = ['1', 'true', 'yes', 'on'].includes((process.env['QQ_SANDBOX'] ?? 'false').toLowerCase())
    const sandboxFlag = qqSandbox
    const qqIntents = defaultIntents[qqType]

    if (qqId && qqSecret && qqToken) {
        ctx.plugin(qq.default, {
            id: qqId,
            secret: qqSecret,
            token: qqToken,
            type: qqType,
            sandbox: sandboxFlag,
            intents: qqIntents,
        } as any)
        logger.info(`已加载 QQ 适配器 type=${qqType} sandbox=${sandboxFlag} intents=${qqIntents}`)
    } else {
        logger.warn('未配置 QQ_APP_ID / QQ_SECRET / QQ_TOKEN，机器人只注册指令，不会连接 QQ 平台')
    }

    ctx.middleware(async (session, next) => {
        const content = session.content?.trimStart()
        if (!content?.startsWith('/') || content.startsWith('//')) {
            return next()
        }

        const commandLine = content.slice(1).trim()
        if (!commandLine) {
            return next()
        }

        return session.execute(commandLine)
    })

    ctx.command('直播总结 <bvid:string>', '根据 BV 号获取直播回放 AI 总结')
        .alias('summary')
        .action(async ({ session }: { session?: Session }, bvid?: string) => {
            const normalized = bvid?.trim()
            if (!normalized) {
                return '请提供 BV 号，例如：直播总结 BV1SPPZz6EHw'
            }
            await session?.send?.(`正在生成 ${normalized} 的直播回放总结，请稍等...`)
            const response = await requestVideoSummaryByBvid(normalized)
            return formatSummaryResponse(response)
        })

    ctx.command('今天播吗', '查询默认主播今天是否直播及未来 7 天日程')
        .action(async () => {
            const response = await requestStreamerSchedule(7)
            return formatStreamerScheduleResponse(response)
        })

    ctx.command('今天播什么', '查询默认主播今天播什么及未来 7 天日程')
        .action(async () => {
            const response = await requestStreamerSchedule(7)
            return formatStreamerScheduleResponse(response)
        })

    ctx.command('日程', '查询默认主播未来 7 天日程')
        .action(async () => {
            const response = await requestStreamerSchedule(7)
            return formatStreamerScheduleResponse(response)
        })

    ctx.command('重新分析日程 [hours:number]', '重新分析指定时间之前到现在的微博日程，默认 24 小时')
        .action(async ({ session }: { session?: Session }, hours?: number) => {
            const safeHours = Math.min(Math.max(Math.floor(hours ?? 24), 1), 24 * 30)
            await session?.send?.(`正在重新分析最近 ${safeHours} 小时的微博日程，请稍等...`)
            const response = await requestStreamerScheduleReanalyze(safeHours)
            return formatStreamerScheduleReanalyzeResponse(response)
        })

    ctx.command('ping', '检查 shark7-bot 是否在线')
        .action(() => 'pong')

    ctx.command('exit', '停止 shark7-bot')
        .action(() => {
            setTimeout(() => process.exit(0), 100)
            return '正在退出 shark7-bot'
        })

    ctx.on('bot-connect', (bot: any) => {
        logger.info(`Koishi bot-connect sid=${bot.sid} status=${bot.status}`)
    })

    ctx.on('bot-disconnect', (bot: any) => {
        logger.warn(`Koishi bot-disconnect sid=${bot.sid} status=${bot.status} error=${bot.error ? String(bot.error) : 'none'}`)
    })

    ctx.on('bot-status-updated', (bot: any) => {
        logger.info(`Koishi bot-status-updated sid=${bot.sid} status=${bot.status}`)
    })

    ctx.on('login-added', (session: any) => {
        logger.info(`Koishi login-added selfId=${session.selfId} platform=${session.platform}`)
    })

    ctx.on('login-updated', (session: any) => {
        logger.info(`Koishi login-updated selfId=${session.selfId} platform=${session.platform}`)
    })

    ctx.on('login-removed', (session: any) => {
        logger.warn(`Koishi login-removed selfId=${session.selfId} platform=${session.platform}`)
    })

    logger.info(`Koishi 服务检查 http=${ctx.get('http') ? 'yes' : 'no'} logger=${ctx.get('logger') ? 'yes' : 'no'} satori=${ctx.get('satori') ? 'yes' : 'no'}`)

    return ctx
}

export async function main() {
    initLogger('shark7-bot')
    configureKoishiLogger()
    const ctx = createContext()
    await ctx.start()
    logger.info('shark7-bot 已启动')
}

if (import.meta.main) {
    main().catch((error) => {
        logger.error(`shark7-bot 启动失败: ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    })
}
