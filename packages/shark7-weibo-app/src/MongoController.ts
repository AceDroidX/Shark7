import { MongoControllerBase, WeiboDBs, logger, type OnlineData, type WeiboMsg } from "shark7-shared"

export class MongoController extends MongoControllerBase<WeiboDBs> {
    async insertLike(blog: WeiboMsg) {
        await this.dbs.likeDB.updateOne({ id: blog.id }, [{ $replaceWith: blog }], { upsert: true })
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
    async getLikeByID(id: number) {
        return await this.dbs.likeDB.findOne({ id })
    }
}
