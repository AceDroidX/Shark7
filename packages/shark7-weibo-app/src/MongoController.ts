import logger from "shark7-shared/dist/logger"
import { MongoControllerBase, WeiboDBs } from 'shark7-shared/dist/database'
import { WeiboDataName, DataDBDoc } from "shark7-shared/dist/datadb"
import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, WithId } from "mongodb"
import { Protocol } from "puppeteer"
import { WeiboUser, WeiboMsg, OnlineData } from 'shark7-shared/dist/weibo';
import { Shark7Event } from "shark7-shared"
import { Scope } from 'shark7-shared/dist/scope'
import { getTime } from "shark7-shared/dist/utils"

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
        return await this.dbs.userDB.findOne({ id })
    }
    async getOnlineDataByID(id: number) {
        return await this.dbs.onlineDB.findOne({ id })
    }
}

export async function onNewLike(ctr: MongoController, event: ChangeStreamInsertDocument<WeiboMsg>): Promise<Shark7Event | null> {
    const mblog = event.fullDocument
    const user = await ctr.getUserInfoByID(mblog._userid)
    if (!user) {
        logger.error(`user为null,event:\n${JSON.stringify(event)}`)
        return null
    }
    const msg = `${mblog.user.screen_name} 发布于${getTime(mblog._timestamp, false)}\n${mblog.text_raw ? mblog.text_raw : mblog.text}`
    return { ts: Number(new Date()), name: user.screen_name, scope: Scope.Weibo.Like, msg }
}

export async function onNewOnlineData(ctr: MongoController, event: ChangeStreamUpdateDocument<OnlineData>, origin: OnlineData | null): Promise<Shark7Event | null> {
    if (!origin) {
        logger.error(`origin为null,event:\n${JSON.stringify(event)}`)
        return null
    }
    const data = event.updateDescription.updatedFields
    if (!data) {
        logger.warn(`event.updateDescription.updatedFields为${data}`)
        return null
    }
    if (Object.keys(data).length == 0) {
        return null
    }
    if (data.desc1 == undefined) {
        logger.warn(`data.desc1不存在${data}`)
        return null
    }
    if (data.online != undefined) {
        const msg = data.online ? '在线' : '离线'
        logger.info(`<${origin.screen_name}>微博在线状态改变:${msg}`)
        return { ts: Number(new Date()), name: String(origin.screen_name), scope: Scope.Weibo.Online, msg }
    }
    return null
}
