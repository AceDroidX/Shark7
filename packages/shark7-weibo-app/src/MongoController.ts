import logger from "shark7-shared/dist/logger"
import { MongoControllerBase, WeiboDBs } from 'shark7-shared/dist/database'
import { WeiboDataName, DataDBDoc } from "shark7-shared/dist/datadb"
import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, WithId } from "mongodb"
import { Protocol } from "puppeteer"
import { WeiboMsg } from "shark7-weibo/dist/model/model"
import { Shark7Event } from "shark7-shared"
import { WeiboUser } from "shark7-weibo/dist/model/WeiboUser"
import { Scope } from 'shark7-shared/dist/scope'
import { getTime } from "shark7-shared/dist/utils"

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
        this.cookieCache = (await this.getCookie()).data
        this.dbs.data.watch([], { fullDocument: 'updateLookup' }).on("change", async event => {
            if (event.operationType == 'insert') {
                logger.warn(`data添加: \n${JSON.stringify(event)}`)
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
        this.dbs.likeDB.watch([], {}).on("change", async event => {
            if (event.operationType == 'insert') {
                const insertEvent = event as ChangeStreamInsertDocument<WeiboMsg>
                logger.info(`likeDB添加: \n${JSON.stringify(insertEvent)}`)
                const user = await this.getUserInfoByID(event.fullDocument._userid)
                this.addShark7Event(onNewLike(user, insertEvent))
            } else if (event.operationType == 'update') {
                const updateEvent = event as ChangeStreamUpdateDocument<WeiboMsg>
                if (!updateEvent.updateDescription.updatedFields) {
                    logger.info(`likeDB更新: \n${JSON.stringify(updateEvent)}`)
                    return
                }
                if (Object.keys(updateEvent.updateDescription.updatedFields).length == 1 && updateEvent.updateDescription.updatedFields.hasOwnProperty('_raw')) {
                    return
                }
            } else {
                logger.warn(`likeDB未知operationType:${event.operationType}`)
                return
            }
        })
    }
    async getCookie(): Promise<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]>> {
        return await this.dbs.data.findOne({ name: WeiboDataName.Cookie }) as WithId<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]>>
    }
    async insertLike(mblog: WeiboMsg) {
        await this.dbs.likeDB.updateOne({ id: mblog.id }, { $set: mblog }, { upsert: true })
    }
    async getUserInfoByID(id: number) {
        return await this.dbs.userDB.findOne({ id }) as WithId<WeiboUser>
    }
}

function onNewLike(user: WeiboUser, event: ChangeStreamInsertDocument<WeiboMsg>): Shark7Event {
    const mblog = event.fullDocument
    const msg = `${mblog.user.screen_name} 发布于${getTime(mblog._timestamp)}\n${mblog.text_raw ? mblog.text_raw : mblog.text}`
    return { ts: Number(new Date()), name: user.screen_name, scope: Scope.Weibo.Like, msg }
}