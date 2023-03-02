import EventEmitter from "events";
import { connect, JSONCodec, NatsConnection } from "nats";
import { logger, WeiboCookieExpireEvent, WeiboCookieRequest, WeiboCookieRespond, WeiboCookieUpdateEvent, WeiboNATSSubscribeName } from "shark7-shared";

const nats_server = process.env['nats_server'] ?? 'localhost'

export class Nats {
    nc: NatsConnection
    eventEmitter: EventEmitter
    constructor(nc: NatsConnection, eventEmitter: EventEmitter) {
        this.nc = nc
        this.eventEmitter = eventEmitter
    }
    static async init(eventEmitter: EventEmitter) {
        logger.debug(`连接至nats服务器:${nats_server}`)
        const nc = await connect({ servers: nats_server })
        logger.info(`nats服务器[${nats_server}]已连接`)
        const nats = new Nats(nc, eventEmitter)
        nats.setupEventHandler()
        return nats
    }
    setupEventHandler() {
        this.eventEmitter.on(WeiboNATSSubscribeName.CookieExpire, this.sendWeiboCookieExpireEvent)
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

        }
        logger.info("subscription closed");
    }
    async requestCookie() {
        logger.info(`requestCookie`)
        const jc = JSONCodec<WeiboCookieRequest>();
        const request = jc.encode({ name: WeiboNATSSubscribeName.Cookie, ts: new Date().getTime() });
        const respond = await this.nc.request(WeiboNATSSubscribeName.Cookie, request, { timeout: 1000 })
        return JSONCodec<WeiboCookieRespond>().decode(respond.data)
    }
}
