import { Collection, MongoClient } from "mongodb";

export class MongoDBs {
    weibo: WeiboDBs
    apex: ApexDBs
    constructor(weibo: WeiboDBs, apex: ApexDBs) {
        this.weibo = weibo
        this.apex = apex
    }
    static getInstance(client: MongoClient) {
        return new MongoDBs(WeiboDBs.getInstance(client), ApexDBs.getInstance(client))
    }
}

export class WeiboDBs {
    mblogsDB: Collection
    userDB: Collection
    constructor(mblogsDB: Collection, userDB: Collection) {
        this.mblogsDB = mblogsDB
        this.userDB = userDB
    }
    static getInstance(client: MongoClient) {
        const mblogsDB = client.db('weibo').collection('mblogs')
        const userDB = client.db('weibo').collection('users')
        return new WeiboDBs(mblogsDB, userDB)
    }
}

export class ApexDBs {
    userinfoDB: Collection
    constructor(userinfoDB: Collection) {
        this.userinfoDB = userinfoDB
    }
    static getInstance(client: MongoClient) {
        const userinfoDB = client.db('apex').collection('userinfo')
        userinfoDB.createIndex({ uid: 1, })
        return new ApexDBs(userinfoDB)
    }
}

export class MongoControllerBase<T> {
    client: MongoClient
    dbs: T
    constructor(client: MongoClient, dbs: T) {
        this.client = client
        this.dbs = dbs
    }
    static getMongoClientConfig() {
        return new MongoClient(
            process.env.NODE_ENV == 'production'
                ? `mongodb://admin:${process.env.MONGODB_PASS}@${process.env.MONGODB_IP}:27017/?authMechanism=DEFAULT`
                : 'mongodb://admin:admin@localhost:27017/'
        )
    }
    async close() {
        await this.client.close()
    }
}