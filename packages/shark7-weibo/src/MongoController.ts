import { MongoControllerBase, WeiboComment, WeiboDBs, WeiboMsg, WeiboUser } from 'shark7-shared';

export class MongoController extends MongoControllerBase<WeiboDBs> {
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
