import { NoRespondersError, RequestError, TimeoutError, type NatsConnection } from "@nats-io/nats-core";
import type { Cookie } from "puppeteer";
import { logger } from "../logger.ts";
import type { WeiboCookieExpireEvent, WeiboCookieRequest, WeiboCookieRespond, WeiboCookieUpdateEvent } from "./nats.ts";
import { WeiboNATSSubscribeName } from "./nats.ts";

export class WeiboCookieMgr {
    nc: NatsConnection
    cookie: Cookie[]
    constructor(nc: NatsConnection, cookie: Cookie[]) {
        this.nc = nc
        this.cookie = cookie
        this.subscribeCookieUpdateTask()
    }
    static async init(nc: NatsConnection) {
        return new WeiboCookieMgr(nc, (await WeiboCookieMgr.requestCookie(nc)).cookie)
    }
    static async requestCookie(nc: NatsConnection) {
        logger.info(`requestCookie`)
        while (true) {
            try {
                const request = { name: WeiboNATSSubscribeName.Cookie, ts: new Date().getTime() } satisfies WeiboCookieRequest
                const respond = await nc.request(WeiboNATSSubscribeName.Cookie, JSON.stringify(request), { timeout: 1000 })
                return respond.json<WeiboCookieRespond>()
            } catch (err: unknown) {
                if (err instanceof RequestError) {
                    const cause = (err as { cause?: unknown }).cause;
                    if (err.isNoResponders() || cause instanceof NoRespondersError) {
                        logger.error("requestCookie NoResponders");
                    } else {
                        logger.error(`requestCookie RequestError: ${err.message}`);
                    }
                } else if (err instanceof TimeoutError) {
                    logger.error("requestCookie Timeout");
                } else if (err instanceof NoRespondersError) {
                    logger.error("requestCookie NoResponders");
                } else if (err instanceof Error) {
                    logger.error(`requestCookie ${err.message}`);
                } else {
                    logger.error("requestCookie Unknown error");
                }
                await new Promise(resolve => setTimeout(resolve, 10000))
            }
        }
    }
    sendWeiboCookieExpireEvent() {
        logger.info(`sendWeiboCookieExpireEvent`)
        const event: WeiboCookieExpireEvent = { name: WeiboNATSSubscribeName.CookieExpire, ts: new Date().getTime() }
        this.nc.publish(WeiboNATSSubscribeName.CookieExpire, JSON.stringify(event))
    }
    async subscribeCookieUpdateTask() {
        while (true) {
            logger.debug(`subscribe:${WeiboNATSSubscribeName.CookieUpdate}`)
            const sub = this.nc.subscribe(WeiboNATSSubscribeName.CookieUpdate, { max: 1 });
            for await (const m of sub) {
                const event = m.json<WeiboCookieUpdateEvent>()
                logger.info(`[${sub.getProcessed()}]: ${JSON.stringify(event)}`);
                this.cookie = event.cookie
            }
            logger.info("subscription closed");
        }
    }
}
