export type Shark7Event = {
    ts: number
    name: string
    scope: string
    msg: string
}

enum WeiboScope {
    USER = '微博用户信息',
    MBLOG = '微博动态',
}

export const Scope = {
    APEX: 'Apex信息',
    WEIBO: WeiboScope,
}