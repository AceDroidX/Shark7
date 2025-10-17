export * from './apex/index.ts'
export * from './bilibili/index.ts'
export * from './bililive/index.ts'
export * from './db/index.ts'
export * from './douyin/index.ts'
export * from './netease-music/index.ts'
export * from './rednote/index.ts'
export * from './Puppeteer/index.ts'
export * from './weibo/index.ts'
export * from './database.ts'
export * from './logger.ts'
export * from './nats.ts'
export * from './scheduler.ts'
export * from './scope.ts'
export * from './utils.ts'

export type Shark7Event = {
    ts: number
    name: string
    from?: string
    scope: string
    msg: string
}

export type LogEvent = {
    timestamp: Date
    level: string
    message: string
    meta: any
}

export type Shark7Doc = {
    shark7_id: string
    shark7_name?: string
    shark7_raw?: any
}

export type InsertTypeDoc = Shark7Doc

export type UpdateTypeDoc = Shark7Doc

export type UpdateTypeDocWithName = UpdateTypeDoc & {
    shark7_name: string
}
