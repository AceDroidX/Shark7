import { BiliGuardState } from "shark7-shared";
import { BiliLiveDBs } from "shark7-shared"
import { MongoControllerBase } from 'shark7-shared';

export {
    MongoController
}

class MongoController extends MongoControllerBase<BiliLiveDBs> {
    async insertGuardState(data: BiliGuardState) {
        return this.dbs.guardDB.updateOne({ uid: data.uid, shark7_id: data.shark7_id }, [{ $replaceWith: data }], { upsert: true })
    }
    async getAllGuardState() {
        return this.dbs.guardDB.find().toArray()
    }
    async getGuardState(uid: number, shark7_id: string) {
        return this.dbs.guardDB.findOne({ uid, shark7_id })
    }
    async delGuardState(uid: number, shark7_id: string) {
        return this.dbs.guardDB.deleteOne({ uid, shark7_id })
    }
}
