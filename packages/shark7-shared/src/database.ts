import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, Collection, MongoClient } from "mongodb";
import { Shark7Event, UpdateTypeDoc } from ".";
import { ApexUserInfo } from "./apex";
import { DouyinUser } from "./douyin";
import logger from "./logger";
import { NeteaseMusicUser } from "./netease-music";
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
    netease_music: NeteaseMusicDBs
    constructor(event: Collection<Shark7Event>, data: Collection, weibo: WeiboDBs, apex: ApexDBs, bililive: BiliLiveDBs, douyin: DouyinDBs, netease_music: NeteaseMusicDBs) {
        super(event, data)
        this.weibo = weibo
        this.apex = apex
        this.bililive = bililive
        this.douyin = douyin
        this.netease_music = netease_music
    }
    static getInstance(client: MongoClient) {
        const event = client.db('main').collection<Shark7Event>('event')
        const data = client.db('main').collection('data')
        return new this(event, data, WeiboDBs.getInstance(client), ApexDBs.getInstance(client), BiliLiveDBs.getInstance(client), DouyinDBs.getInstance(client), NeteaseMusicDBs.getInstance(client))
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
    userinfoDB: Collection<ApexUserInfo>
    constructor(event: Collection<Shark7Event>, data: Collection, userinfoDB: Collection<ApexUserInfo>) {
        super(event, data)
        this.userinfoDB = userinfoDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('apex').collection<Shark7Event>('event')
        const data = client.db('apex').collection('data')
        const userinfoDB = client.db('apex').collection<ApexUserInfo>('userinfo')
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
    userDB: Collection<DouyinUser>
    constructor(event: Collection<Shark7Event>, data: Collection, userDB: Collection<DouyinUser>) {
        super(event, data)
        this.userDB = userDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('douyin').collection<Shark7Event>('event')
        const data = client.db('douyin').collection('data')
        const userDB = client.db('douyin').collection<DouyinUser>('users')
        event.createIndex({ ts: -1 })
        return new this(event, data, userDB)
    }
}

export class NeteaseMusicDBs extends EventDBs {
    userDB: Collection<NeteaseMusicUser>
    constructor(event: Collection<Shark7Event>, data: Collection, userDB: Collection<NeteaseMusicUser>) {
        super(event, data)
        this.userDB = userDB
    }
    static getInstance(client: MongoClient) {
        const event = client.db('netease-music').collection<Shark7Event>('event')
        const data = client.db('netease-music').collection('data')
        const userDB = client.db('netease-music').collection<NeteaseMusicUser>('users')
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
    async addShark7Event(event: Shark7Event) {
        await this.ctr.addShark7Event(event)
    }
    addInsertChangeWatcher<T>(db: Collection<T>, onInsert: { (ctr: C, event: ChangeStreamInsertDocument<T>): Promise<Shark7Event | null> }) {
        db.watch().on("change", async event => {
            if (event.operationType == 'insert') {
                const result = await onInsert(this.ctr, event)
                if (result) await this.addShark7Event(result)
            } else if (event.operationType == 'update') {
                let isrealchange = false
                for (const field in event.updateDescription.updatedFields) {
                    if (!field.startsWith('shark7_')) { isrealchange = true; break }
                }
                if (isrealchange) logger.warn(`insert数据更新\n${JSON.stringify(event)}`)
            } else {
                logger.warn(`insert数据未知operationType:${event.operationType}`)
                return
            }
        })
    }
    addUpdateChangeWatcher<T extends UpdateTypeDoc>(db: Collection<T>, origin: { id: string, data: T | null }[], onUpdate: { (ctr: C, event: ChangeStreamUpdateDocument<T>, origin: T | null): Promise<Shark7Event | null> }) {
        db.watch([], { fullDocument: 'updateLookup' }).on("change", async event => {
            if (event.operationType == 'insert') {
                logger.info(`update数据添加: \n${JSON.stringify(event)}`)
                for (const [index, item] of origin.entries()) {
                    if (item.id == event.fullDocument.shark7_id) {
                        origin[index].data = event.fullDocument
                    }
                }
            } else if (event.operationType == 'update') {
                if (!event.fullDocument) {
                    logger.error(`update数据无fullDocument: \n${JSON.stringify(event)}`)
                    return
                }
                for (const [index, item] of origin.entries()) {
                    if (item.id == event.fullDocument.shark7_id) {
                        const result = await onUpdate(this.ctr, event, origin ? origin[index].data : null)
                        if (result) await this.addShark7Event(result)
                        origin[index].data = event.fullDocument
                    }
                }
            } else {
                logger.warn(`update数据未知operationType:${event.operationType}`)
                return
            }
        })
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
}
