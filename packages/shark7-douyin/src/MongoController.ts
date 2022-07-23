import logger from "shark7-shared/dist/logger"
import { DouyinDBs, MongoControllerBase } from 'shark7-shared/dist/database'
import { logErrorDetail } from "shark7-shared/dist/utils"
import { ChangeStreamUpdateDocument, WithId } from "mongodb"
import { onUserDBEvent } from "./event"

export class MongoController extends MongoControllerBase<DouyinDBs> {
    async run() {
        if (!process.env['douyin_sec_uid']) {
            logger.error('请设置douyin_sec_uid')
            process.exit(1)
        }
        let tempDouyinUser: DouyinUser = await this.getUserInfoBySecUID(process.env['douyin_sec_uid'])
        this.dbs.userDB.watch([], { fullDocument: 'updateLookup' }).on("change", async event => {
            // logger.info(`userDB改变: \n${JSON.stringify(event)}`)
            if (event.operationType == 'insert') {
                logger.info(`userDB添加: \n${JSON.stringify(event)}`)
                tempDouyinUser = event.fullDocument as DouyinUser
            } else if (event.operationType == 'update') {
                const userevent = event as ChangeStreamUpdateDocument<DouyinUser>
                let shark7event
                try {
                    shark7event = onUserDBEvent(tempDouyinUser, userevent)
                } catch (err) {
                    logErrorDetail('onUserDBEvent出错', err)
                    logger.error(JSON.stringify(tempDouyinUser))
                    return
                }
                if (userevent.fullDocument) tempDouyinUser = userevent.fullDocument
                if (!shark7event) return
                this.addShark7Event(shark7event)
            } else {
                logger.warn(`mblogsDB未知operationType:${event.operationType}`)
                return
            }
        })
    }
    async getUserInfoBySecUID(sec_uid: string) {
        return await this.dbs.userDB.findOne({ sec_uid: sec_uid }) as WithId<DouyinUser>
    }
    async updateUserInfo(user: DouyinUser) {
        await this.dbs.userDB.updateOne({ uid: user.uid }, {
            $set: user
        }, { upsert: true })
    }
}
