import logger from "shark7-shared/dist/logger"
// import { onMblogEvent } from "./weibo.ts"
import { MongoControllerBase, MongoDBs } from "shark7-shared/dist/database"
import { Shark7Event } from "shark7-shared"
import { ChangeStreamInsertDocument } from "mongodb"
import { sendEvent } from "./event"

export {
    MongoController
}

class MongoController extends MongoControllerBase<MongoDBs> {
    static async getInstance() {
        try {
            const client = this.getMongoClientConfig()
            await client.connect()
            let dbs = MongoDBs.getInstance(client)
            logger.info('数据库已连接')
            return new MongoController(client, dbs)
        } catch (err) {
            console.log(`ERR when connect to DBS`)
            console.log(err)
            process.exit(1)
        }
    }
    run() {
        // const userDBChangeStream = this.dbs.weibo.userDB.watch();
        // userDBChangeStream.on("change", event => {
        //     logger.info(`用户信息数据库改变: \n${JSON.stringify(event)}`)
        //     // onMblogEvent(event)
        // });
        // const mblogsDBChangeStream = this.dbs.weibo.mblogsDB.watch();
        // mblogsDBChangeStream.on("change", event => {
        //     logger.info(`微博数据库改变: \n${JSON.stringify(event)}`)
        // });
        const apexEventChangeStream = this.dbs.apex.event.watch()
        apexEventChangeStream.on("change", event => {
            logger.info(`Apex事件改变: \n${JSON.stringify(event)}`)
            const apexEvent = event as ChangeStreamInsertDocument<Shark7Event>
            sendEvent(apexEvent.fullDocument)
        })
    }
}