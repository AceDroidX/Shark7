import { MongoControllerBase, WeiboDBs } from 'shark7-shared/dist/database'
import { WeiboDataName } from 'shark7-shared/dist/datadb'
import { Protocol } from "puppeteer"

export class MongoController extends MongoControllerBase<WeiboDBs> {
    async updateCookie(cookie: Protocol.Network.Cookie[]) {
        return await this.dbs.data.updateOne({ name: WeiboDataName.Cookie }, {
            $set: { data: cookie }
        }, { upsert: true })
    }
}
