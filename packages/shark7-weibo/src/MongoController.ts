import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, WithId } from "mongodb";
import { Protocol } from "puppeteer";
import { WeiboDBs } from 'shark7-shared';
import { DataDBDoc, WeiboDataName } from 'shark7-shared/dist/datadb';
import { MongoControllerBase } from 'shark7-shared';
import { logger } from "shark7-shared";
import { WeiboComment, WeiboMsg, WeiboUser } from 'shark7-shared';

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
        logger.info('MongoController初始化完毕')
    }
    async getCookie(): Promise<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]> | null> {
        return await this.dbs.data.findOne({ name: WeiboDataName.Cookie }) as WithId<DataDBDoc<WeiboDataName, Protocol.Network.Cookie[]>>
    }
    async insertMblog(mblog: WeiboMsg) {
        await this.dbs.mblogsDB.updateOne({ id: mblog.id }, [{ $replaceWith: mblog }], { upsert: true })
    }
    async isMblogIDExist(id: number): Promise<boolean> {
        const res = await this.dbs.mblogsDB.findOne({ id: id })
        return res != null
    }
    async insertUserInfo(user: WeiboUser) {
        await this.dbs.userDB.updateOne({ id: user.id }, [{ $replaceWith: user }], { upsert: true })
    }
    async getUserInfoByID(id: number) {
        return await this.dbs.userDB.findOne({ id })
    }
    async insertComment(comment: WeiboComment) {
        return await this.dbs.commentsDB.updateOne({ id: comment.id }, [{ $replaceWith: comment }], { upsert: true })
    }
}
