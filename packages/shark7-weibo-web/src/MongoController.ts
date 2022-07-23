import logger from "shark7-shared/dist/logger"
import { MongoControllerBase, WeiboDBs } from 'shark7-shared/dist/database'
import { WeiboDataName } from 'shark7-shared/dist/datadb'
import { Protocol } from "puppeteer"

export class MongoController extends MongoControllerBase<WeiboDBs> {
    static async getInstance() {
        try {
            const client = await this.getMongoClientConfig().connect()
            const dbs = WeiboDBs.getInstance(client)
            logger.info('WeiboDBs数据库已连接')
            return new MongoController(client, dbs)
        } catch (err) {
            console.log('ERR when connect to AMDB')
            console.log(err)
            process.exit(1)
        }
    }
    async updateCookie(cookie: Protocol.Network.Cookie[]) {
        return await this.dbs.data.updateOne({ name: WeiboDataName.Cookie }, {
            $set: { data: cookie }
        }, { upsert: true })
    }
}
