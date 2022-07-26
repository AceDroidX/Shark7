import { ApexDBs, MongoControllerBase } from "shark7-shared/dist/database"
import { ApexUserInfo } from "shark7-shared/dist/apex"

export {
    MongoController
}

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
