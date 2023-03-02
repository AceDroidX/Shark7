import { ErrorCode, JSONCodec, NatsConnection } from "nats";
import { Protocol } from "puppeteer";
import { logger, WeiboCookieExpireEvent, WeiboCookieRequest, WeiboCookieRespond, WeiboCookieUpdateEvent, WeiboNATSSubscribeName } from "shark7-shared";

export class WeiboCookieMgr {
    nc: NatsConnection
    cookie: Protocol.Network.Cookie[]
    constructor(nc: NatsConnection, cookie: Protocol.Network.Cookie[]) {
        this.nc = nc
        this.cookie = cookie
        this.subscribeCookieUpdateTask()
    }
    static async init(nc: NatsConnection) {
        return new WeiboCookieMgr(nc, (await WeiboCookieMgr.requestCookie(nc)).cookie)
    }
    static async requestCookie(nc: NatsConnection) {
        logger.info(`requestCookie`)
        const jc = JSONCodec<WeiboCookieRequest>();
        const request = jc.encode({ name: WeiboNATSSubscribeName.Cookie, ts: new Date().getTime() });
        try {
            const respond = await nc.request(WeiboNATSSubscribeName.Cookie, request, { timeout: 1000 })
            return JSONCodec<WeiboCookieRespond>().decode(respond.data)
        } catch (err: any) {
            switch (err.code) {
                case ErrorCode.NoResponders:
                    logger.error("requestCookie ErrorCode.NoResponders");
                    break;
                case ErrorCode.Timeout:
                    logger.error("requestCookie ErrorCode.Timeout");
                    break;
                default:
                    logger.error("requestCookie" + JSON.stringify(err));
            }
            process.exit(1)
        }
    }
    sendWeiboCookieExpireEvent() {
        logger.info(`sendWeiboCookieExpireEvent`)
        const jc = JSONCodec<WeiboCookieExpireEvent>();
        this.nc.publish(WeiboNATSSubscribeName.CookieExpire, jc.encode({ name: WeiboNATSSubscribeName.CookieExpire, ts: new Date().getTime() }))
    }
    async subscribeCookieUpdateTask() {
        logger.debug(`subscribe:${WeiboNATSSubscribeName.CookieUpdate}`)
        const jc = JSONCodec<WeiboCookieUpdateEvent>();
        const sub = this.nc.subscribe(WeiboNATSSubscribeName.CookieUpdate, { max: 1 });
        for await (const m of sub) {
            logger.info(`[${sub.getProcessed()}]: ${JSON.stringify(jc.decode(m.data))}`);
            this.cookie = jc.decode(m.data).cookie
        }
        logger.info("subscription closed");
    }
}
