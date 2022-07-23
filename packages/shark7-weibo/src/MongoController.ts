import logger from "shark7-shared/dist/logger"
import { WeiboMsg } from "./model/model"
import { WeiboUser } from "./model/WeiboUser"
import { MongoControllerBase, WeiboDBs } from 'shark7-shared/dist/database'
import { onMblogEvent, onUserDBEvent } from "./event"
import { logErrorDetail, toNumOrStr } from "shark7-shared/dist/utils"
import { DataDBDoc, WeiboDataName } from 'shark7-shared/dist/datadb'
import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, WithId } from "mongodb"
import { Protocol } from "puppeteer"

export class MongoController extends MongoControllerBase<WeiboDBs> {
    cookieCache: Protocol.Network.Cookie[] | undefined
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
        this.cookieCache = (await this.getCookie())?.data
        this.dbs.data.watch([], { fullDocument: 'updateLookup' }).on("change", async event => {
            if (event.operationType == 'insert') {
                logger.info(`data添加: \n${JSON.stringify(event)}`)
                if (event.fullDocument.name == WeiboDataName.Cookie) {
                    const insertEvent = event as ChangeStreamInsertDocument<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]>>
                    this.cookieCache = insertEvent.fullDocument.data
                }
            } else if (event.operationType == 'update') {
                const updateEvent = event as ChangeStreamUpdateDocument<DataDBDoc<WeiboDataName, any>>
                logger.info(`data更新: \n${JSON.stringify(updateEvent)}`)
                if (updateEvent.updateDescription.updatedFields?.name == WeiboDataName.Cookie) {
                    this.cookieCache = updateEvent.updateDescription.updatedFields.data
                }
            } else {
                logger.warn(`data未知operationType:${event.operationType}`)
                return
            }
        })
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
                logger.info(`userDB添加: \n${JSON.stringify(event)}`)
                const userevent = event as ChangeStreamInsertDocument<WeiboUser>
                tempWeiboUser = userevent.fullDocument
            } else if (event.operationType == 'update') {
                const userevent = event as ChangeStreamUpdateDocument<WeiboUser>
                let shark7event
                try {
                    shark7event = onUserDBEvent(tempWeiboUser, userevent)
                } catch (err) {
                    logErrorDetail('onUserDBEvent出错', err)
                    logger.error(JSON.stringify(tempWeiboUser))
                    return
                }
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
        logger.info('MongoController初始化完毕')
    }
    async getCookie(): Promise<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]> | null> {
        return await this.dbs.data.findOne({ name: WeiboDataName.Cookie }) as WithId<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]>>
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
