import { connect } from "nats";
import { logger } from "./logger";

const nats_server = process.env['nats_server'] ?? 'localhost'
export class Nats {
    static async connect() {
        logger.debug(`连接至nats服务器:${nats_server}`)
        const nc = await connect({ servers: nats_server })
        logger.info(`nats服务器[${nats_server}]已连接`)
        return nc
    }
}
