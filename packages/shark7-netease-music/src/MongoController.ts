import { NeteaseMusicDBs } from 'shark7-shared';
import { MongoControllerBase } from 'shark7-shared';
import { NeteaseMusicUser } from 'shark7-shared';

export class MongoController extends MongoControllerBase<NeteaseMusicDBs> {
    async insertUser(user: NeteaseMusicUser) {
        return await this.dbs.userDB.updateOne({ shark7_id: user.shark7_id }, [{ $replaceWith: user }], { upsert: true })
    }
    async getUser(id: number) {
        return await this.dbs.userDB.findOne({ shark7_id: String(id) })
    }
}
