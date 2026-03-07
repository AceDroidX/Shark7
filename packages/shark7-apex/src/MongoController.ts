import type { ApexUserInfo } from "shark7-shared";
import { ApexDBs, MongoControllerBase } from "shark7-shared";

export {
    MongoController
};

class MongoController extends MongoControllerBase<ApexDBs> {
    async insertUserInfo(user: ApexUserInfo) {
        await this.dbs.userinfoDB.updateOne({ uid: user.uid }, [{ $replaceWith: user }], { upsert: true })
    }
    async getUserInfo(uid: number) {
        return await this.dbs.userinfoDB.findOne({ uid })
    }
    run() {
    }
}
