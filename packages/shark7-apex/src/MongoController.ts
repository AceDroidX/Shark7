import { Collection, MongoClient } from "mongodb"
import logger from "./logger"

export {
    MongoController
}

class MongoController {
    client: MongoClient
    userinfoDB: Collection
    constructor(client: MongoClient, userinfoDB: Collection) {
        this.client = client
        this.userinfoDB = userinfoDB
    }
    static async getInstance() {
        const client = new MongoClient(
            process.env.NODE_ENV == 'development'
                ? 'mongodb://localhost:27017/'
                : 'mongodb://admin:' +
                process.env.MONGODB_PASS +
                '@' +
                process.env.MONGODB_IP +
                ':27017/?authMechanism=DEFAULT'
        )
        let userinfoDB
        try {
            await client.connect()
            userinfoDB = client.db('apex').collection('userinfo')
        } catch (err) {
            console.log('ERR when connect to AMDB')
            console.log(err)
            process.exit(1)
        }
        userinfoDB.createIndex({ uid: 1, })
        logger.info('数据库已连接')
        return new MongoController(client, userinfoDB)
    }
    async close() {
        await this.client.close()
    }
    async insertUserInfo(user: any) {
        await this.userinfoDB.updateOne({ uid: user.uid }, {
            $set: user
        }, { upsert: true })
    }
}