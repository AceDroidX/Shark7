import { DouyinDBs, MongoControllerBase } from 'shark7-shared/dist/database'

export class MongoController extends MongoControllerBase<DouyinDBs> {
    async run() {
    }
    async getUserInfoBySecUID(sec_uid: string) {
        return await this.dbs.userDB.findOne({ sec_uid: sec_uid })
    }
    async updateUserInfo(user: DouyinUser) {
        await this.dbs.userDB.updateOne({ uid: user.uid }, [{ $replaceWith: user }], { upsert: true })
    }
}
