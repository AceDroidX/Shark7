import logger from "shark7-shared/dist/logger"
import { DouyinDBs, MongoControllerBase } from 'shark7-shared/dist/database'
import { logErrorDetail } from "shark7-shared/dist/utils"
import { ChangeStreamUpdateDocument, WithId } from "mongodb"
import { onUserDBEvent } from "./event"

export class MongoController extends MongoControllerBase<DouyinDBs> {
    async run() {
    }
    async getUserInfoBySecUID(sec_uid: string) {
        return await this.dbs.userDB.findOne({ sec_uid: sec_uid })
    }
    async updateUserInfo(user: DouyinUser) {
        await this.dbs.userDB.updateOne({ uid: user.uid }, {
            $set: user
        }, { upsert: true })
    }
}
