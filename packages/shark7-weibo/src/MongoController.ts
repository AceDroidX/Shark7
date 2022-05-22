import logger from "shark7-shared/dist/logger"
import { WeiboMsg } from "./model/model"
import { WeiboUser } from "./model/WeiboUser"
import { MongoControllerBase, WeiboDBs } from 'shark7-shared/dist/database'
import { onMblogEvent, onUserDBEvent } from "./event"
import { toNumOrStr } from "shark7-shared/dist/utils"
import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, WithId } from "mongodb"

export class MongoController extends MongoControllerBase<WeiboDBs> {
    static async getInstance() {
        try {
            const client = await this.getMongoClientConfig().connect()
            const dbs = WeiboDBs.getInstance(client)
            logger.info('WeiboDBs数据库已连接')
            return new MongoController(client, dbs)
        } catch (err) {
            console.log('ERR when connect to AMDB')
            console.log(err)
            process.exit(1)
        }
    }
    async run() {
        const weibo_id = toNumOrStr(process.env['weibo_id'])
        if (typeof weibo_id != "number") {
            logger.error('请设置weibo_id')
            process.exit(1)
        }
        let tempWeiboUser: WeiboUser = await this.getUserInfoByID(weibo_id)
        const userDBChangeStream = this.dbs.userDB.watch([], { fullDocument: 'updateLookup' })
        userDBChangeStream.on("change", async event => {
            logger.info(`userDB改变: \n${JSON.stringify(event)}`)
            if (event.operationType == 'insert') {
                logger.warn(`userDB添加: \n${JSON.stringify(event)}`)
            } else if (event.operationType == 'update') {
                const userevent = event as ChangeStreamUpdateDocument<WeiboUser>
                const shark7event = onUserDBEvent(tempWeiboUser, userevent)
                if (userevent.fullDocument) tempWeiboUser = userevent.fullDocument
                if (!shark7event) return
                this.addShark7Event(shark7event)
            } else {
                logger.warn(`mblogsDB未知operationType:${event.operationType}`)
                return
            }
        })
        const mblogsDBChangeStream = this.dbs.mblogsDB.watch()
        mblogsDBChangeStream.on("change", async event => {
            logger.info(`mblogsDB改变: \n${JSON.stringify(event)}`)
            if (event.operationType == 'insert') {
                const user = await this.getUserInfoByID(weibo_id)
                this.addShark7Event(onMblogEvent(user, event as ChangeStreamInsertDocument<WeiboMsg>))
            } else if (event.operationType == 'update') {
                logger.warn(`mblogsDB更新\n${JSON.stringify(event)}`)
            } else {
                logger.warn(`mblogsDB未知operationType:${event.operationType}`)
                return
            }
        })
    }
    async insertMblog(mblog: WeiboMsg) {
        logger.info('数据库添加新微博', mblog.mblogid)
        await this.dbs.mblogsDB.updateOne({ id: mblog.id }, {
            $set: mblog
        }, { upsert: true })
    }
    async isMblogIDExist(id: number): Promise<boolean> {
        const res = await this.dbs.mblogsDB.findOne({ id: id })
        return res != null
    }
    async insertUserInfo(user: WeiboUser) {
        await this.dbs.userDB.updateOne({ id: user.id }, {
            $set: user
        }, { upsert: true })
    }
    async getUserInfoByID(id: number) {
        return await this.dbs.userDB.findOne({ id }) as WithId<WeiboUser>
    }
}