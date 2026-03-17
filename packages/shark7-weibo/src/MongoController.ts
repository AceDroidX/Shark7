import { MongoControllerBase, WeiboDBs, WeiboMsg, WeiboUser, type WeiboComment } from 'shark7-shared';

export class MongoController extends MongoControllerBase<WeiboDBs> {
    async insertMblog(mblog: WeiboMsg) {
        await this.dbs.mblogsDB.updateOne({ id: mblog.id }, [{ $replaceWith: mblog }], { upsert: true })
    }
    async isMblogIDExist(id: number): Promise<boolean> {
        const res = await this.dbs.mblogsDB.findOne({ id: id })
        return res != null
    }
    async getMblogByID(id: number) {
        return await this.dbs.mblogsDB.findOne({ id })
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
    async getCommentById(id: number) {
        return await this.dbs.commentsDB.findOne({ id })
    }
    async listCommentsByMblogIdAndUserId(mblogId: number, uid: number) {
        return await this.dbs.commentsDB.find({ _mblogid: mblogId, 'user.id': uid }).toArray()
    }
}
