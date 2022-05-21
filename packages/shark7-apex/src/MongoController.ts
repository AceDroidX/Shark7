import logger from "shark7-shared/dist/logger"
import { ApexDBs, MongoControllerBase } from "shark7-shared/dist/database"
import { onUserInfoEvent } from "./onUserInfoEvent"
import { Shark7Event } from "shark7-shared"
import { ChangeStreamUpdateDocument } from "mongodb"

export {
    MongoController
}

class MongoController extends MongoControllerBase<ApexDBs> {
    static async getInstance() {
        try {
            const client = this.getMongoClientConfig()
            await client.connect()
            let dbs = ApexDBs.getInstance(client)
            logger.info('数据库已连接')
            return new MongoController(client, dbs)
        } catch (err) {
            console.log(`ERR when connect to DBS`)
            console.log(err)
            process.exit(1)
        }
    }
    async insertUserInfo(user: any) {
        await this.dbs.userinfoDB.updateOne({ uid: user.uid }, {
            $set: user
        }, { upsert: true })
    }
    async addEvent(event: Shark7Event) {
        await this.dbs.event.insertOne(event)
    }
    run() {
        const userinfoDBChangeStream = this.dbs.userinfoDB.watch([], { fullDocument: "updateLookup" });
        userinfoDBChangeStream.on("change", event => {
            logger.info(`Apex用户信息数据库改变: \n${JSON.stringify(event)}`)
            const userinfoEvent = onUserInfoEvent(event as ChangeStreamUpdateDocument)
            if (!userinfoEvent) return
            this.addEvent(userinfoEvent)
        })
    }
}