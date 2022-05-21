import logger from "shark7-shared/dist/logger"
import { ApexDBs, MongoControllerBase } from "shark7-shared/dist/database"

export {
    MongoController
}

class MongoController extends MongoControllerBase<ApexDBs> {
    static async getInstance() {
        try {
            const client = await this.getMongoClientConfig()
            await client.connect()
            let dbs = ApexDBs.getInstance(client)
            logger.info('数据库已连接')
            return new MongoController(client, dbs)
        } catch (err) {
            console.log(`ERR when connect to DBS`)
            console.log(err)
            process.exit(1)
        }
    }
    async insertUserInfo(user: any) {
        await this.dbs.userinfoDB.updateOne({ uid: user.uid }, {
            $set: user
        }, { upsert: true })
    }
}