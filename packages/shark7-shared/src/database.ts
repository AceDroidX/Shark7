import { Collection, Db, MongoClient } from "mongodb";
import { Shark7Event } from ".";
import { ApexUserInfo } from "./apex";
import { BiliUser, BiliVideo } from "./bilibili";
import { getDBInstance } from "./db";
import { DouyinUser } from "./douyin";
import { NeteaseMusicUser } from "./netease-music";
import { OnlineData, WeiboComment, WeiboMsg, WeiboUser } from "./weibo";

export class EventDBs {
    event: Collection<Shark7Event>
    constructor(db: Db) {
        this.event = db.collection<Shark7Event>('event')
    }
}
export class MongoDBs extends EventDBs {
    weibo: WeiboDBs
    apex: ApexDBs
    bililive: BiliLiveDBs
    bilibili: BilibiliDBs
    douyin: DouyinDBs
    netease_music: NeteaseMusicDBs
    constructor(db: Db, weibo: WeiboDBs, apex: ApexDBs, bililive: BiliLiveDBs, bilibili: BilibiliDBs, douyin: DouyinDBs, netease_music: NeteaseMusicDBs) {
        super(db)
        this.weibo = weibo
        this.apex = apex
        this.bililive = bililive
        this.bilibili = bilibili
        this.douyin = douyin
        this.netease_music = netease_music
    }
    static async getInstance(client: MongoClient) {
        return new this(client.db('main'),
            await getDBInstance(client, WeiboDBs),
            await getDBInstance(client, ApexDBs),
            await getDBInstance(client, BiliLiveDBs),
            await getDBInstance(client, BilibiliDBs),
            await getDBInstance(client, DouyinDBs),
            await getDBInstance(client, NeteaseMusicDBs),
        )
    }
}

export class WeiboDBs extends EventDBs {
    static dbname = 'weibo'
    static postCollList = ['mblogs', 'users']
    data: Collection
    mblogsDB: Collection<WeiboMsg>
    commentsDB: Collection<WeiboComment>
    userDB: Collection<WeiboUser>
    likeDB: Collection<WeiboMsg>
    onlineDB: Collection<OnlineData>
    constructor(db: Db) {
        super(db)
        this.data = db.collection('data')
        this.mblogsDB = db.collection<WeiboMsg>('mblogs')
        this.commentsDB = db.collection<WeiboComment>('comments')
        this.userDB = db.collection<WeiboUser>('users')
        this.likeDB = db.collection<WeiboMsg>('likes')
        this.onlineDB = db.collection<OnlineData>('online')
        this.mblogsDB.createIndex({ id: -1 })
        this.commentsDB.createIndex({ id: -1 })
        this.likeDB.createIndex({ id: -1 })
    }
}

export class ApexDBs extends EventDBs {
    static dbname = 'apex'
    static postCollList = ['userinfo']
    userinfoDB: Collection<ApexUserInfo>
    constructor(db: Db) {
        super(db)
        this.userinfoDB = db.collection<ApexUserInfo>('userinfo')
    }
}

export class BiliLiveDBs extends EventDBs {
    static dbname = 'bililive'
    static postCollList = []
}

export class DouyinDBs extends EventDBs {
    static dbname = 'douyin'
    static postCollList = ['users']
    userDB: Collection<DouyinUser>
    constructor(db: Db) {
        super(db)
        this.userDB = db.collection<DouyinUser>('users')
    }
}

export class NeteaseMusicDBs extends EventDBs {
    static dbname = 'netease-music'
    static postCollList = ['users']
    userDB: Collection<NeteaseMusicUser>
    constructor(db: Db) {
        super(db)
        this.userDB = db.collection<NeteaseMusicUser>('users')
    }
}

export class BilibiliDBs extends EventDBs {
    static dbname = 'bilibili'
    static postCollList = ['users']
    userDB: Collection<BiliUser>
    coinDB: Collection<BiliVideo>
    likeDB: Collection<BiliVideo>
    dynamicDB: Collection
    constructor(db: Db) {
        super(db)
        this.userDB = db.collection<BiliUser>('users')
        this.coinDB = db.collection<BiliVideo>('coin')
        this.likeDB = db.collection<BiliVideo>('like')
        this.dynamicDB = db.collection('dynamic')
    }
}
