import logger from "shark7-shared/dist/logger"
import { ApexDBs, MongoControllerBase } from "shark7-shared/dist/database"
import { onUserInfoEvent } from "./onUserInfoEvent"
import { ChangeStreamDocument } from "mongodb"

export {
    MongoController
}

class MongoController extends MongoControllerBase<ApexDBs> {
    async insertUserInfo(user: any) {
        await this.dbs.userinfoDB.updateOne({ uid: user.uid }, {
            $set: user
        }, { upsert: true })
    }
    run() {
        const userinfoDBChangeStream = this.dbs.userinfoDB.watch([], { fullDocument: "updateLookup" });
        userinfoDBChangeStream.on("change", event => {
            logger.info(`Apex用户信息数据库改变: \n${JSON.stringify(event)}`)
            const userinfoEvent = onUserInfoEvent(event as ChangeStreamDocument)
            if (!userinfoEvent) return
            this.addShark7Event(userinfoEvent)
        })
    }
}
