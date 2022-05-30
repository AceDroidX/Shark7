import logger from "shark7-shared/dist/logger"
import { BiliLiveDBs, MongoControllerBase } from "shark7-shared/dist/database"

export {
    MongoController
}

class MongoController extends MongoControllerBase<BiliLiveDBs> {
    static async getInstance() {
        try {
            const client = this.getMongoClientConfig()
            await client.connect()
            let dbs = BiliLiveDBs.getInstance(client)
            logger.info('BiliLiveDBs数据库已连接')
            return new MongoController(client, dbs)
        } catch (err) {
            console.log(`ERR when connect to DBS`)
            console.log(err)
            process.exit(1)
        }
    }
    run() {
        // todo
    }
}