import logger from "shark7-shared/dist/logger"
import { MongoControllerBase, MongoDBs } from "shark7-shared/dist/database"
import { onEventChange } from "./event"

export {
    MongoController
}

class MongoController extends MongoControllerBase<MongoDBs> {
    static async getInstance() {
        try {
            const client = this.getMongoClientConfig()
            await client.connect()
            let dbs = MongoDBs.getInstance(client)
            logger.info('MongoDBs数据库已连接')
            return new MongoController(client, dbs)
        } catch (err) {
            console.log(`ERR when connect to DBS`)
            console.log(err)
            process.exit(1)
        }
    }
    run() {
        this.dbs.weibo.event.watch().on("change", onEventChange);
        this.dbs.apex.event.watch().on("change", onEventChange)
        this.dbs.bililive.event.watch().on("change", onEventChange)
    }
}