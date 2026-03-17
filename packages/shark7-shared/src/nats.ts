import { connect, type NatsConnection } from "@nats-io/transport-node";
import { logger } from "./logger.ts";
import type { LogEvent, Shark7Event } from "./index.ts";

const nats_server = process.env['nats_server'] ?? 'localhost'
export class Nats {
    static async connect() {
        logger.debug(`连接至nats服务器:${nats_server}`)
        const nc = await connect({ servers: nats_server })
        logger.info(`nats服务器[${nats_server}]已连接`)
        return nc
    }
}

export const Shark7EventSubjects = {
    APEX: 'shark7.event.apex',
    WEIBO: 'shark7.event.weibo',
    BILIBILI: 'shark7.event.bilibili',
    BILILIVE: 'shark7.event.bililive',
    DOUYIN: 'shark7.event.douyin',
    REDNOTE: 'shark7.event.rednote',
    NETEASE_MUSIC: 'shark7.event.netease-music',
    LOG: 'shark7.event.log',
    RECKFENG: 'shark7.event.reckfeng',
} as const

export const Shark7RpcSubjects = {
    AI_SUMMARY_BY_BVID: 'shark7.rpc.ai.summary-by-bvid',
    AI_STREAMER_SCHEDULE_QUERY: 'shark7.rpc.ai.streamer-schedule-query',
    AI_STREAMER_SCHEDULE_REANALYZE: 'shark7.rpc.ai.streamer-schedule-reanalyze',
} as const

export const Shark7JobSubjects = {
    AI_STREAMER_SCHEDULE_REFRESH: 'shark7.job.ai.streamer-schedule-refresh',
} as const

export class Shark7EventPublisher {
    nc: NatsConnection
    constructor(nc: NatsConnection) {
        this.nc = nc
    }
    
    async publish(event: Shark7Event | LogEvent): Promise<boolean> {
        const subject = this.getSubjectByEvent(event)
        try {
            this.nc.publish(subject, JSON.stringify(event))
            return true
        } catch (err) {
            logger.error(`NATS发布失败: ${err}`)
            return false
        }
    }
    
    private getSubjectByEvent(event: Shark7Event | LogEvent): string {
        if ('level' in event) {
            return Shark7EventSubjects.LOG
        }
        if (event.scope.startsWith('Apex')) return Shark7EventSubjects.APEX
        if (event.scope.startsWith('Weibo')) return Shark7EventSubjects.WEIBO
        if (event.scope.startsWith('Bilibili')) return Shark7EventSubjects.BILIBILI
        if (event.scope.startsWith('BiliLive')) return Shark7EventSubjects.BILILIVE
        if (event.scope.startsWith('Douyin')) return Shark7EventSubjects.DOUYIN
        if (event.scope.startsWith('Rednote')) return Shark7EventSubjects.REDNOTE
        if (event.scope.startsWith('NeteaseMusic')) return Shark7EventSubjects.NETEASE_MUSIC
        return Shark7EventSubjects.RECKFENG
    }
}

export class Shark7EventSubscriber {
    nc: NatsConnection
    constructor(nc: NatsConnection) {
        this.nc = nc
    }
    
    async subscribeShark7Event(callback: (event: Shark7Event) => void) {
        const subjects = [
            Shark7EventSubjects.APEX,
            Shark7EventSubjects.WEIBO,
            Shark7EventSubjects.BILIBILI,
            Shark7EventSubjects.BILILIVE,
            Shark7EventSubjects.DOUYIN,
            Shark7EventSubjects.REDNOTE,
            Shark7EventSubjects.NETEASE_MUSIC,
            Shark7EventSubjects.RECKFENG,
        ]
        
        for (const subject of subjects) {
            const sub = this.nc.subscribe(subject)
            logger.info(`订阅主题: ${subject}`)
            ;(async () => {
                for await (const msg of sub) {
                    try {
                        const event = JSON.parse(String(msg.data)) as Shark7Event
                        callback(event)
                    } catch (err) {
                        logger.error(`解析NATS消息失败: ${err}`)
                    }
                }
            })()
        }
    }
    
    async subscribeLogEvent(callback: (event: LogEvent, collName: string) => void) {
        const sub = this.nc.subscribe(Shark7EventSubjects.LOG)
        logger.info(`订阅主题: ${Shark7EventSubjects.LOG}`)
        ;(async () => {
            for await (const msg of sub) {
                try {
                    const event = JSON.parse(String(msg.data)) as LogEvent
                    callback(event, 'log')
                } catch (err) {
                    logger.error(`解析LogEvent失败: ${err}`)
                }
            }
        })()
    }
}
