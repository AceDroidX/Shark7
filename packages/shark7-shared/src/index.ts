export type Shark7Event = {
    ts: number
    name: string
    scope: string
    msg: string
}

export type InsertTypeDoc = {
    shark7_raw?: any
}

export type UpdateTypeDoc = {
    shark7_id: string
    shark7_name?: string
}
