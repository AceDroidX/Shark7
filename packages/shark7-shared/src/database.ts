import { Collection, Db, MongoClient } from "mongodb";
import { Shark7Event } from ".";
import { ApexUserInfo } from "./apex";
import { DouyinUser } from "./douyin";
import { NeteaseMusicUser } from "./netease-music";
import { OnlineData, WeiboMsg, WeiboUser } from "./weibo";

const PostChangeStream = { changeStreamPreAndPostImages: { enabled: true } }

export class EventDBs {
    event: Collection<Shark7Event>
    data: Collection
    constructor(event: Collection<Shark7Event>, data: Collection) {
        this.event = event
        this.data = data
    }
    static async initPostChangeColl(db: Db, collList: string[]) {
        for (const item of await db.listCollections({}, { nameOnly: false }).toArray()) {
            if (collList.includes(item.name)) {
                if (item.options?.changeStreamPreAndPostImages?.enabled) {
                    const index = collList.indexOf(item.name);
                    if (index > -1) {
                        collList.splice(index, 1)
                    }
                } else {
                    db.command({ collMod: item.name, changeStreamPreAndPostImages: { enabled: true } })
                }
            }
        }
        await Promise.all(collList.map(name => db.createCollection(name, PostChangeStream)))
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
    static async getInstance(client: MongoClient) {
        const event = client.db('main').collection<Shark7Event>('event')
        const data = client.db('main').collection('data')
        return new this(event, data,
            await WeiboDBs.getInstance(client),
            await ApexDBs.getInstance(client),
            BiliLiveDBs.getInstance(client),
            await DouyinDBs.getInstance(client),
            await NeteaseMusicDBs.getInstance(client)
        )
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
    static async getInstance(client: MongoClient) {
        const db = client.db('weibo')
        await this.initPostChangeColl(db, ['mblogs', 'users', 'online'])
        const event = db.collection<Shark7Event>('event')
        const data = db.collection('data')
        const mblogsDB = db.collection<WeiboMsg>('mblogs')
        const userDB = db.collection<WeiboUser>('users')
        const likeDB = db.collection<WeiboMsg>('likes')
        const onlineDB = db.collection<OnlineData>('online')
        mblogsDB.createIndex({ id: -1 })
        likeDB.createIndex({ id: -1 })
        return new this(event, data, mblogsDB, userDB, likeDB, onlineDB)
    }
}

export class ApexDBs extends EventDBs {
    userinfoDB: Collection<ApexUserInfo>
    constructor(event: Collection<Shark7Event>, data: Collection, userinfoDB: Collection<ApexUserInfo>) {
        super(event, data)
        this.userinfoDB = userinfoDB
    }
    static async getInstance(client: MongoClient) {
        const db = client.db('apex')
        await this.initPostChangeColl(db, ['userinfo'])
        const event = db.collection<Shark7Event>('event')
        const data = db.collection('data')
        const userinfoDB = db.collection<ApexUserInfo>('userinfo')
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
    static async getInstance(client: MongoClient) {
        const db = client.db('douyin')
        await this.initPostChangeColl(db, ['users'])
        const event = db.collection<Shark7Event>('event')
        const data = db.collection('data')
        const userDB = db.collection<DouyinUser>('users')
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
    static async getInstance(client: MongoClient) {
        const db = client.db('netease-music')
        await this.initPostChangeColl(db, ['users'])
        const event = db.collection<Shark7Event>('event')
        const data = db.collection('data')
        const userDB = db.collection<NeteaseMusicUser>('users')
        event.createIndex({ ts: -1 })
        return new this(event, data, userDB)
    }
}
