import EventEmitter from "events";
import { connect, JSONCodec, NatsConnection } from "nats";
import { WeiboNATSEventName, WeiboCookieExpireEvent } from "shark7-shared";
import logger from "shark7-shared/dist/logger";

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
    sendWeiboCookieExpireEvent() {
        logger.info(`sendWeiboCookieExpireEvent`)
        const jc = JSONCodec<WeiboCookieExpireEvent>();
        this.nc.publish(WeiboNATSEventName.CookieExpire, jc.encode({ name: WeiboNATSEventName.CookieExpire, ts: new Date().getTime() }))
    }
    setupEventHandler() {
        this.eventEmitter.on(WeiboNATSEventName.CookieExpire, this.sendWeiboCookieExpireEvent)
    }
}
