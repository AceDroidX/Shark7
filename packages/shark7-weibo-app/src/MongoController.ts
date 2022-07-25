import logger from "shark7-shared/dist/logger"
import { MongoControllerBase, WeiboDBs } from 'shark7-shared/dist/database'
import { WeiboDataName, DataDBDoc } from "shark7-shared/dist/datadb"
import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, WithId } from "mongodb"
import { Protocol } from "puppeteer"
import { WeiboUser, WeiboMsg, OnlineData } from 'shark7-shared/dist/weibo';
import { Shark7Event } from "shark7-shared"
import { Scope } from 'shark7-shared/dist/scope'
import { getTime, logErrorDetail } from "shark7-shared/dist/utils"

export class MongoController extends MongoControllerBase<WeiboDBs> {
    cookieCache: Protocol.Network.Cookie[] | undefined
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
                if (event.fullDocument?.name == WeiboDataName.Cookie) {
                    this.cookieCache = updateEvent.fullDocument?.data
                }
            } else {
                logger.warn(`data未知operationType:${event.operationType}`)
                return
            }
        })
        if (!process.env['weibo_id']) {
            logger.error('请设置weibo_id')
            process.exit(1)
        }
        const weibo_id = Number(process.env['weibo_id'])
        let tempOnlineData: OnlineData = await this.getOnlineDataByID(weibo_id)
        this.dbs.onlineDB.watch([], { fullDocument: 'updateLookup' }).on("change", async raw => {
            if (raw.operationType == 'insert') {
                logger.info(`onlineDB添加: \n${JSON.stringify(raw)}`)
                const event = raw as ChangeStreamInsertDocument<OnlineData>
                tempOnlineData = event.fullDocument
            } else if (raw.operationType == 'update') {
                const event = raw as ChangeStreamUpdateDocument<OnlineData>
                let shark7event
                try {
                    shark7event = onNewOnlineData(tempOnlineData, event)
                } catch (err) {
                    logErrorDetail('onNewOnlineData出错', err)
                    logger.error(JSON.stringify(tempOnlineData))
                    return
                }
                if (event.fullDocument) tempOnlineData = event.fullDocument
                if (!shark7event) return
                this.addShark7Event(shark7event)
            } else {
                logger.warn(`onlineDB未知operationType:${raw.operationType}`)
                return
            }
        })
    }
    async getCookie(): Promise<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]> | null> {
        return await this.dbs.data.findOne({ name: WeiboDataName.Cookie }) as WithId<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]>>
    }
    async insertLike(mblog: WeiboMsg) {
        await this.dbs.likeDB.updateOne({ id: mblog.id }, [{ $replaceWith: mblog }], { upsert: true })
    }
    async insertOnline(data: OnlineData) {
        await this.dbs.onlineDB.updateOne({ id: data.id }, [{ $replaceWith: data }], { upsert: true })
    }
    async getUserInfoByID(id: number) {
        return await this.dbs.userDB.findOne({ id }) as WithId<WeiboUser>
    }
    async getOnlineDataByID(id: number) {
        return await this.dbs.onlineDB.findOne({ id }) as WithId<OnlineData>
    }
}

export async function onNewLike(ctr: MongoController, event: ChangeStreamInsertDocument<WeiboMsg>): Promise<Shark7Event | null> {
    const mblog = event.fullDocument
    const user = await ctr.getUserInfoByID(mblog._userid)
    const msg = `${mblog.user.screen_name} 发布于${getTime(mblog._timestamp, false)}\n${mblog.text_raw ? mblog.text_raw : mblog.text}`
    return { ts: Number(new Date()), name: user.screen_name, scope: Scope.Weibo.Like, msg }
}

function onNewOnlineData(origin: OnlineData, event: ChangeStreamUpdateDocument<OnlineData>): Shark7Event | undefined {
    const data = event.updateDescription.updatedFields
    if (!data) {
        logger.warn(`event.updateDescription.updatedFields为${data}`)
        return
    }
    if (Object.keys(data).length == 0) {
        return
    }
    if (data.desc1 == undefined) {
        logger.warn(`data.desc1不存在${data}`)
        return
    }
    if (data.online != undefined) {
        const msg = data.online ? '在线' : '离线'
        logger.info(`<${origin.screen_name}>微博在线状态改变:${msg}`)
        return { ts: Number(new Date()), name: String(origin.screen_name), scope: Scope.Weibo.Online, msg }
    }
}
