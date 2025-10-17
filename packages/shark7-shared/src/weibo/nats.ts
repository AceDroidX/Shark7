import type { Cookie } from "puppeteer"

export const WeiboNATSSubscribeName = {
    CookieExpire: 'Weibo.CookieExpire',
    CookieUpdate: 'Weibo.CookieUpdate',
    Cookie: 'Weibo.Cookie',
} as const;
export type WeiboNATSSubscribeName = typeof WeiboNATSSubscribeName[keyof typeof WeiboNATSSubscribeName];

export type WeiboCookieExpireEvent = {
    name: typeof WeiboNATSSubscribeName.CookieExpire
    ts: number
}

export type WeiboCookieUpdateEvent = {
    name: typeof WeiboNATSSubscribeName.CookieUpdate
    ts: number
    cookie: Cookie[]
}

export type WeiboCookieRequest = {
    name: typeof WeiboNATSSubscribeName.Cookie
    ts: number
}

export type WeiboCookieRespond = {
    name: typeof WeiboNATSSubscribeName.Cookie
    ts: number
    cookie: Cookie[]
}
