import { connect, JSONCodec, NatsConnection } from "nats";
import { Protocol } from "puppeteer";
import { logger, WeiboCookieExpireEvent, WeiboCookieRequest, WeiboCookieRespond, WeiboCookieUpdateEvent, WeiboNATSSubscribeName } from "shark7-shared";
import { WeiboWeb } from "./WeiboWeb";

const nats_server = process.env['nats_server'] ?? 'localhost'

export class Nats {
    nc: NatsConnection
    weiboWeb?: WeiboWeb
    constructor(nc: NatsConnection, weiboWeb?: WeiboWeb) {
        this.nc = nc
        this.weiboWeb = weiboWeb
    }
    static async connect() {
        logger.debug(`连接至nats服务器:${nats_server}`)
        const nc = await connect({ servers: nats_server })
        logger.info(`nats服务器[${nats_server}]已连接`)
        const nats = new Nats(nc)
        nats.subscribeCookieExpireTask()
        nats.respondCookieTask()
        return nats
    }
    init(weiboWeb: WeiboWeb) {
        this.weiboWeb = weiboWeb
    }
    async subscribeCookieExpireTask() {
        while (true) {
            await this.subscribeCookieExpire()
            logger.debug(`subscribeCookieExpire休眠`)
            await new Promise(r => setTimeout(r, 5 * 60 * 1000));
        }
    }
    async subscribeCookieExpire() {
        logger.debug(`subscribe:${WeiboNATSSubscribeName.CookieExpire}`)
        const jc = JSONCodec<WeiboCookieExpireEvent>();
        const sub = this.nc.subscribe(WeiboNATSSubscribeName.CookieExpire, { max: 1 });
        for await (const m of sub) {
            logger.info(`[${sub.getProcessed()}]: ${JSON.stringify(jc.decode(m.data))}`);
            if (!this.weiboWeb) {
                logger.error('this.weiboWeb not init')
                continue
            }
            await this.weiboWeb.refreshTask()
        }
        logger.info("subscription closed");
    }
    async respondCookieTask() {
        const jcRequest = JSONCodec<WeiboCookieRequest>();
        const jcRespond = JSONCodec<WeiboCookieRespond>();
        const sub = this.nc.subscribe(WeiboNATSSubscribeName.Cookie);
        for await (const m of sub) {
            if (!this.weiboWeb) {
                logger.warn('this.weiboWeb not init')
                continue
            }
            if(!this.weiboWeb.cookie){
                logger.warn('!this.weiboWeb.cookie')
                continue
            }
            if (m.respond(jcRespond.encode({ name: WeiboNATSSubscribeName.Cookie, ts: new Date().getTime(), cookie: this.weiboWeb.cookie }))) {
                logger.info(`[respondCookieTask] #${sub.getProcessed()}: ${JSON.stringify(jcRequest.decode(m.data))} handled`);
            } else {
                logger.debug(`[respondCookieTask] #${sub.getProcessed()}: ${JSON.stringify(jcRequest.decode(m.data))} ignored - no reply subject`);
            }
        }
    }
    sendWeiboCookieUpdateEvent(cookie: Protocol.Network.Cookie[]) {
        logger.info(`sendWeiboCookieUpdateEvent`)
        const jc = JSONCodec<WeiboCookieUpdateEvent>();
        this.nc.publish(WeiboNATSSubscribeName.CookieUpdate, jc.encode({ name: WeiboNATSSubscribeName.CookieUpdate, ts: new Date().getTime(), cookie }))
    }
}
