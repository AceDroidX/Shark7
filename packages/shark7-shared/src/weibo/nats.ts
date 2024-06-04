import type { Cookie } from "puppeteer"

export enum WeiboNATSSubscribeName {
    CookieExpire = 'Weibo.CookieExpire',
    CookieUpdate = 'Weibo.CookieUpdate',
    Cookie = 'Weibo.Cookie',
}

export type WeiboCookieExpireEvent = {
    name: WeiboNATSSubscribeName.CookieExpire
    ts: number
}

export type WeiboCookieUpdateEvent = {
    name: WeiboNATSSubscribeName.CookieUpdate
    ts: number
    cookie: Cookie[]
}

export type WeiboCookieRequest = {
    name: WeiboNATSSubscribeName.Cookie
    ts: number
}

export type WeiboCookieRespond = {
    name: WeiboNATSSubscribeName.Cookie
    ts: number
    cookie: Cookie[]
}
