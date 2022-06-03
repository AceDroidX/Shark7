import { Collection, MongoClient } from "mongodb";
import { Shark7Event } from ".";

class EventDBs {
    event: Collection
    data: Collection
    constructor(event: Collection, data: Collection) {
        this.event = event
        this.data = data
    }
}
export class MongoDBs extends EventDBs {
    weibo: WeiboDBs
    apex: ApexDBs
    bililive: BiliLiveDBs
    constructor(event: Collection, data: Collection, weibo: WeiboDBs, apex: ApexDBs, bililive: BiliLiveDBs) {
        super(event, data)
        this.weibo = weibo
        this.apex = apex
        this.bililive = bililive
    }
    static getInstance(client: MongoClient) {
        const event = client.db('main').collection('event')
        const data = client.db('main').collection('data')
        return new this(event, data, WeiboDBs.getInstance(client), ApexDBs.getInstance(client), BiliLiveDBs.getInstance(client))
    }
}

export class WeiboDBs extends EventDBs {
    mblogsDB: Collection
    userDB: Collection
    likeDB: Collection
    constructor(event: Collection, data: Collection, mblogsDB: Collection, userDB: Collection, likeDB: Collection) {
        super(event, data)
        this.mblogsDB = mblogsDB
        this.userDB = userDB
        this.likeDB = likeDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('weibo').collection('event')
        const data = client.db('weibo').collection('data')
        const mblogsDB = client.db('weibo').collection('mblogs')
        const userDB = client.db('weibo').collection('users')
        const likeDB = client.db('weibo').collection('likes')
        return new this(event, data, mblogsDB, userDB, likeDB)
    }
}

export class ApexDBs extends EventDBs {
    userinfoDB: Collection
    constructor(event: Collection, data: Collection, userinfoDB: Collection) {
        super(event, data)
        this.userinfoDB = userinfoDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('apex').collection('event')
        const data = client.db('apex').collection('data')
        const userinfoDB = client.db('apex').collection('userinfo')
        event.createIndex({ ts: -1 })
        userinfoDB.createIndex({ uid: 1, })
        return new this(event, data, userinfoDB)
    }
}

export class BiliLiveDBs extends EventDBs {
    static getInstance(client: MongoClient) {
        const event = client.db('bililive').collection('event')
        const data = client.db('bililive').collection('data')
        event.createIndex({ ts: -1 })
        return new this(event, data)
    }
}

export class DouyinDBs extends EventDBs {
    userDB: Collection
    constructor(event: Collection, data: Collection, userDB: Collection) {
        super(event, data)
        this.userDB = userDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('douyin').collection('event')
        const data = client.db('douyin').collection('data')
        const userDB = client.db('douyin').collection('users')
        event.createIndex({ ts: -1 })
        return new this(event, data, userDB)
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
    async addShark7Event(event: Shark7Event) {
        await this.dbs.event.insertOne(event)
    }
    async close() {
        await this.client.close()
    }
}