import { Collection, MongoClient } from "mongodb";
import { Shark7Event } from ".";
import logger from "./logger";
import { logErrorDetail } from "./utils";
import { OnlineData, WeiboMsg, WeiboUser } from "./weibo";

export class EventDBs {
    event: Collection<Shark7Event>
    data: Collection
    constructor(event: Collection<Shark7Event>, data: Collection) {
        this.event = event
        this.data = data
    }
}
export class MongoDBs extends EventDBs {
    weibo: WeiboDBs
    apex: ApexDBs
    bililive: BiliLiveDBs
    douyin: DouyinDBs
    constructor(event: Collection<Shark7Event>, data: Collection, weibo: WeiboDBs, apex: ApexDBs, bililive: BiliLiveDBs, douyin: DouyinDBs) {
        super(event, data)
        this.weibo = weibo
        this.apex = apex
        this.bililive = bililive
        this.douyin = douyin
    }
    static getInstance(client: MongoClient) {
        const event = client.db('main').collection<Shark7Event>('event')
        const data = client.db('main').collection('data')
        return new this(event, data, WeiboDBs.getInstance(client), ApexDBs.getInstance(client), BiliLiveDBs.getInstance(client), DouyinDBs.getInstance(client))
    }
}

export class WeiboDBs extends EventDBs {
    mblogsDB: Collection<WeiboMsg>
    userDB: Collection<WeiboUser>
    likeDB: Collection<WeiboMsg>
    onlineDB: Collection<OnlineData>
    constructor(event: Collection<Shark7Event>, data: Collection, mblogsDB: Collection<WeiboMsg>, userDB: Collection<WeiboUser>, likeDB: Collection<WeiboMsg>, onlineDB: Collection<OnlineData>) {
        super(event, data)
        this.mblogsDB = mblogsDB
        this.userDB = userDB
        this.likeDB = likeDB
        this.onlineDB = onlineDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('weibo').collection<Shark7Event>('event')
        const data = client.db('weibo').collection('data')
        const mblogsDB = client.db('weibo').collection<WeiboMsg>('mblogs')
        const userDB = client.db('weibo').collection<WeiboUser>('users')
        const likeDB = client.db('weibo').collection<WeiboMsg>('likes')
        const onlineDB = client.db('weibo').collection<OnlineData>('online')
        return new this(event, data, mblogsDB, userDB, likeDB, onlineDB)
    }
}

export class ApexDBs extends EventDBs {
    userinfoDB: Collection
    constructor(event: Collection<Shark7Event>, data: Collection, userinfoDB: Collection) {
        super(event, data)
        this.userinfoDB = userinfoDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('apex').collection<Shark7Event>('event')
        const data = client.db('apex').collection('data')
        const userinfoDB = client.db('apex').collection('userinfo')
        event.createIndex({ ts: -1 })
        userinfoDB.createIndex({ uid: 1, })
        return new this(event, data, userinfoDB)
    }
}

export class BiliLiveDBs extends EventDBs {
    static getInstance(client: MongoClient) {
        const event = client.db('bililive').collection<Shark7Event>('event')
        const data = client.db('bililive').collection('data')
        event.createIndex({ ts: -1 })
        return new this(event, data)
    }
}

export class DouyinDBs extends EventDBs {
    userDB: Collection
    constructor(event: Collection<Shark7Event>, data: Collection, userDB: Collection) {
        super(event, data)
        this.userDB = userDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('douyin').collection<Shark7Event>('event')
        const data = client.db('douyin').collection('data')
        const userDB = client.db('douyin').collection('users')
        event.createIndex({ ts: -1 })
        return new this(event, data, userDB)
    }
}

export class MongoControlClient<E extends EventDBs, C extends MongoControllerBase<E>> {
    client: MongoClient
    ctr: C
    constructor(client: MongoClient, ctr: C) {
        this.client = client
        this.ctr = ctr
    }
    static getMongoClientConfig() {
        return new MongoClient(
            process.env.NODE_ENV == 'production'
                ? `mongodb://admin:${process.env.MONGODB_PASS}@${process.env.MONGODB_IP}:27017/?authMechanism=DEFAULT`
                : 'mongodb://admin:admin@localhost:27017/'
        )
    }
    static async getInstance<E extends EventDBs, C extends MongoControllerBase<E>>(dbfunc: {
        getInstance(client: MongoClient): E;
    }, ctrfunc: { new(dbs: E): C }) {
        try {
            const client = await this.getMongoClientConfig().connect()
            const dbs = dbfunc.getInstance(client)
            const ctr = new ctrfunc(dbs)
            logger.info('数据库已连接')
            return new this(client, ctr)
        } catch (err) {
            logErrorDetail('数据库连接失败', err)
            process.exit(1)
        }
    }
    async close() {
        await this.client.close()
    }
}

export class MongoControllerBase<T extends EventDBs> {
    dbs: T
    constructor(dbs: T) {
        this.dbs = dbs
    }
    async addShark7Event(event: Shark7Event) {
        await this.dbs.event.insertOne(event)
    }
    addInsertChangeEvent<T>(db: Collection<T>) {

    }
}
