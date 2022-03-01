import { Collection, MongoClient } from "mongodb"
import { onUserInfoEvent } from "./apex"
import logger from "./logger"
// import { onMblogEvent } from "./weibo.ts"
import { MongoDBs } from "./model/MongoDBs"

export {
    MongoController
}

class MongoController {
    client: MongoClient
    dbs: MongoDBs

    constructor(client: MongoClient, dbs: MongoDBs) {
        this.client = client
        this.dbs = dbs
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
        let dbs
        try {
            await client.connect()
            dbs = new MongoDBs({
                weibo: {
                    mblogsDB: client.db('weibo').collection('mblogs'),
                    userDB: client.db('weibo').collection('users')
                },
                apex: {
                    userinfoDB: client.db('apex').collection('userinfo')
                }
            })
        } catch (err) {
            console.log('ERR when connect to AMDB')
            console.log(err)
            process.exit(1)
        }
        logger.info('数据库已连接')
        return new MongoController(client, dbs)
    }
    async close() {
        await this.client.close()
    }
    run() {
        const userDBChangeStream = this.dbs.weibo.userDB.watch();
        userDBChangeStream.on("change", event => {
            logger.info(`用户信息数据库改变: \n${JSON.stringify(event)}`)
            // onMblogEvent(event)
        });
        const mblogsDBChangeStream = this.dbs.weibo.mblogsDB.watch();
        mblogsDBChangeStream.on("change", event => {
            logger.info(`微博数据库改变: \n${JSON.stringify(event)}`)
        });
        const userinfoDBChangeStream = this.dbs.apex.userinfoDB.watch([], { fullDocument: "updateLookup" });
        userinfoDBChangeStream.on("change", event => {
            logger.info(`Apex用户信息数据库改变: \n${JSON.stringify(event)}`)
            onUserInfoEvent(event)
        })
    }
}