import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument } from "mongodb"
import { getTime, logger, MongoControllerBase, OnlineData, Scope, Shark7Event, WeiboDBs, WeiboMsg } from "shark7-shared"

export class MongoController extends MongoControllerBase<WeiboDBs> {
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

export async function onNewOnlineData(ctr: MongoController, event: ChangeStreamUpdateDocument<OnlineData>, origin?: OnlineData): Promise<Shark7Event | null> {
    const data = event.fullDocument
    if (!data) {
        logger.warn(`event.fullDocument为${data}`)
        return null
    }
    const updated = event.updateDescription.updatedFields
    if (!updated) {
        logger.warn(`event.updateDescription.updatedFields为${updated}`)
        return null
    }
    if (Object.keys(updated).length == 0) {
        return null
    }
    if (updated.desc1 == undefined) {
        logger.warn(`data.desc1不存在${updated}`)
        return null
    }
    if (updated.online != undefined) {
        const msg = updated.online ? '在线' : '离线'
        logger.info(`<${data.screen_name}>微博在线状态改变:${msg}`)
        return { ts: Number(new Date()), name: String(data.screen_name), scope: Scope.Weibo.Online, msg }
    }
    return null
}
