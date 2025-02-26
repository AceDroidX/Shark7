export * from './apex'
export * from './bilibili'
export * from './bililive'
export * from './db'
export * from './douyin'
export * from './netease-music'
export * from './rednote'
export * from './Puppeteer'
export * from './weibo'
export * from './database'
export * from './logger'
export * from './nats'
export * from './scheduler'
export * from './scope'
export * from './utils'

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
