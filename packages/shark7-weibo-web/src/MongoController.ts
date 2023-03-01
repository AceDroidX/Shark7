import { Protocol } from "puppeteer";
import { WeiboDBs } from 'shark7-shared';
import { WeiboDataName } from 'shark7-shared/dist/datadb';
import { MongoControllerBase } from 'shark7-shared';

export class MongoController extends MongoControllerBase<WeiboDBs> {
    async updateCookie(cookie: Protocol.Network.Cookie[]) {
        return await this.dbs.data.updateOne({ name: WeiboDataName.Cookie }, {
            $set: { data: cookie }
        }, { upsert: true })
    }
}
