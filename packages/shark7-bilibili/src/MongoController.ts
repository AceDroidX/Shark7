import { BiliUser } from 'shark7-shared/dist/bilibili';
import { BilibiliDBs } from 'shark7-shared/dist/database';
import { MongoControllerBase } from 'shark7-shared/dist/db';

export class MongoController extends MongoControllerBase<BilibiliDBs> {
    async insertUser(user: BiliUser) {
        return await this.dbs.userDB.updateOne({ shark7_id: user.shark7_id }, [{ $replaceWith: user }], { upsert: true })
    }
    async getUser(id: number) {
        return await this.dbs.userDB.findOne({ shark7_id: String(id) })
    }
}
