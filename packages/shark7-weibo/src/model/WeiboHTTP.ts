import axios from "axios";
import EventEmitter from "events";
import { Protocol } from "puppeteer";
import { cookieJsonToStr, logErrorDetail, logger, WeiboNATSSubscribeName } from "shark7-shared";
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36'

export class WeiboHTTP {
    eventEmitter: EventEmitter
    cookieCache: Protocol.Network.Cookie[]
    constructor(eventEmitter: EventEmitter, cookieCache: Protocol.Network.Cookie[]) {
        this.eventEmitter = eventEmitter
        this.cookieCache = cookieCache
        this.eventEmitter.on(WeiboNATSSubscribeName.CookieUpdate, (cookie) => this.cookieCache = cookie)
    }
    async getURL<T = any>(url: string) {
        try {
            return await axios.get<T>(url, { headers: { 'User-Agent': UA, 'cookie': cookieJsonToStr(this.cookieCache) } })
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                logger.warn('抓取数据失败:请求错误\n' + JSON.stringify(err.toJSON()))
            } else {
                logErrorDetail('抓取数据失败', err)
            }
            return null
        }
    }
}
