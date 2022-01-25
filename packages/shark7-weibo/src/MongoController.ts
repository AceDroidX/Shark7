import { Collection, MongoClient } from "mongodb"
import logger from "./logger"
import { WeiboMsg } from "./model/model"
import { WeiboUser } from "./model/WeiboUser"

export {
    MongoController
}

class MongoController {
    client: MongoClient
    mblogsDB: Collection
    userDB: Collection
    constructor(client: MongoClient, mblogsDB: Collection, userDB: Collection) {
        this.client = client
        this.mblogsDB = mblogsDB
        this.userDB = userDB
    }
    static async getInstance() {
        const client = new MongoClient(
            process.env.NODE_ENV == 'development'
                ? 'mongodb://localhost:27017/weibo'
                : 'mongodb://admin:' +
                process.env.MONGODB_PASS +
                '@' +
                process.env.MONGODB_IP +
                ':27017/weibo?authMechanism=DEFAULT'
        )
        let mblogsDB, userDB
        try {
            await client.connect()
            mblogsDB = client.db('weibo').collection('mblogs')
            userDB = client.db('weibo').collection('users')
        } catch (err) {
            console.log('ERR when connect to AMDB')
            console.log(err)
            process.exit(1)
        }
        mblogsDB.createIndex({ ts: -1, })
        logger.info('数据库已连接')
        return new MongoController(client, mblogsDB, userDB)
    }
    async close() {
        await this.client.close()
    }
    async insertMblog(mblog: WeiboMsg) {
        await this.mblogsDB.updateOne({ id: mblog.id }, {
            $set: mblog
        }, { upsert: true })
    }
    async insertUserInfo(user: WeiboUser) {
        await this.userDB.updateOne({ id: user.id }, {
            $set: user
        }, { upsert: true })
    }
}