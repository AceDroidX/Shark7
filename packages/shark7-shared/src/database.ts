import { Collection, MongoClient } from "mongodb";

class EventDBs {
    event: Collection
    constructor(event: Collection) {
        this.event = event
    }
}
export class MongoDBs extends EventDBs {
    weibo: WeiboDBs
    apex: ApexDBs
    constructor(event: Collection, weibo: WeiboDBs, apex: ApexDBs) {
        super(event)
        this.weibo = weibo
        this.apex = apex
    }
    static getInstance(client: MongoClient) {
        const event = client.db('main').collection('event')
        return new MongoDBs(event, WeiboDBs.getInstance(client), ApexDBs.getInstance(client))
    }
}

export class WeiboDBs extends EventDBs {
    mblogsDB: Collection
    userDB: Collection
    constructor(event: Collection, mblogsDB: Collection, userDB: Collection) {
        super(event)
        this.mblogsDB = mblogsDB
        this.userDB = userDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('weibo').collection('event')
        const mblogsDB = client.db('weibo').collection('mblogs')
        const userDB = client.db('weibo').collection('users')
        return new WeiboDBs(event, mblogsDB, userDB)
    }
}

export class ApexDBs extends EventDBs {
    userinfoDB: Collection
    constructor(event: Collection, userinfoDB: Collection) {
        super(event)
        this.userinfoDB = userinfoDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('apex').collection('event')
        const userinfoDB = client.db('apex').collection('userinfo')
        event.createIndex({ ts: -1 })
        userinfoDB.createIndex({ uid: 1, })
        return new ApexDBs(event, userinfoDB)
    }
}

export class MongoControllerBase<T extends EventDBs> {
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