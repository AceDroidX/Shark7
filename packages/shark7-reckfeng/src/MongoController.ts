import { MongoControllerBase, ReckfengDBs } from 'shark7-shared';
import { ReckfengData } from 'shark7-shared/dist/reckfeng';

export class MongoController extends MongoControllerBase<ReckfengDBs> {
    async insertUser(user: ReckfengData) {
        return await this.dbs.userDB.updateOne({ playerGuid: user.playerGuid, mapId: user.mapId }, [{ $replaceWith: user }], { upsert: true })
    }
    // async getUser(id: number) {
    //     return await this.dbs.userDB.findOne({ shark7_id: String(id) })
    // }
}
