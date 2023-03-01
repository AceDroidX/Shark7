import { connect, JSONCodec, NatsConnection } from "nats";
import { WeiboNATSEventName, WeiboCookieExpireEvent } from "shark7-shared";
import { logger } from "shark7-shared";
import { WeiboController } from "./WeiboController";

const nats_server = process.env['nats_server'] ?? 'localhost'

export async function natsMain(weiboCtr: WeiboController) {
    logger.debug(`连接至nats服务器:${nats_server}`)
    // to create a connection to a nats-server:
    const nc = await connect({ servers: nats_server });
    logger.info(`nats服务器[${nats_server}]已连接`)
    subscribeCookieExpireTask(nc, weiboCtr)
}

async function subscribeCookieExpireTask(nc: NatsConnection, weiboCtr: WeiboController) {
    while (true) {
        await subscribeCookieExpire(nc, weiboCtr)
        logger.debug(`subscribeCookieExpire休眠`)
        await new Promise(r => setTimeout(r, 5 * 60 * 1000));
    }
}

async function subscribeCookieExpire(nc: NatsConnection, weiboCtr: WeiboController) {
    logger.debug(`subscribe:${WeiboNATSEventName.CookieExpire}`)
    const jc = JSONCodec<WeiboCookieExpireEvent>();
    const sub = nc.subscribe(WeiboNATSEventName.CookieExpire, { max: 1 });
    for await (const m of sub) {
        logger.info(`[${sub.getProcessed()}]: ${JSON.stringify(jc.decode(m.data))}`);
        await weiboCtr.weiboWeb.refreshTask()
    }
    logger.info("subscription closed");
}
