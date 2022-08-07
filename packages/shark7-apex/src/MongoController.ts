import { ApexUserInfo } from "shark7-shared/dist/apex";
import { ApexDBs } from "shark7-shared/dist/database";
import { MongoControllerBase } from 'shark7-shared/dist/db';

export {
    MongoController
};

class MongoController extends MongoControllerBase<ApexDBs> {
    async insertUserInfo(user: ApexUserInfo) {
        await this.dbs.userinfoDB.updateOne({ uid: user.uid }, {
            $set: user
        }, { upsert: true })
    }
    async getUserInfo(uid: number) {
        return await this.dbs.userinfoDB.findOne({ uid })
    }
    run() {
    }
}
