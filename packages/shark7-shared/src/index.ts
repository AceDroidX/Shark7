export type Shark7Event = {
    ts: number
    name: string
    scope: string
    msg: string
}

export type LogEvent = {
    timestamp: Date
    level: string
    message: string
    meta: any
}

export type InsertTypeDoc = {
    shark7_id: string
    shark7_name?: string
    shark7_raw?: any
}

export type UpdateTypeDoc = {
    shark7_id: string
    shark7_name?: string
    shark7_raw?: any
}

export type UpdateTypeDocWithName = UpdateTypeDoc & {
    shark7_name: string
}
