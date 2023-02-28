export enum WeiboNATSEventName {
    CookieExpire = 'Weibo.CookieExpire'
}

export type WeiboCookieExpireEvent = {
    name: WeiboNATSEventName.CookieExpire
    ts: number
}

