import { connect, JSONCodec, NatsConnection } from "nats";
import { logger } from "./logger";

const nats_server = process.env['nats_server'] ?? 'localhost'
export class NatsBase {
    nc: NatsConnection
    constructor(nc: NatsConnection) {
        this.nc = nc
    }
    static async connect() {
        logger.debug(`连接至nats服务器:${nats_server}`)
        const nc = await connect({ servers: nats_server })
        logger.info(`nats服务器[${nats_server}]已连接`)
        const nats = new this(nc)
        return nats
    }
}