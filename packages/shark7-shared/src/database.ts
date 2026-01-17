import { Collection, Db, MongoClient } from "mongodb";
import type { RednoteComment, RednoteNote, RednoteNoteDetail, RednoteUser, Shark7Event } from "./index.ts";
import type { ApexUserInfo } from "./apex/index.ts";
import type { BiliDynamic } from "./bilibili/BiliDynamic.ts";
import type { BiliUser } from "./bilibili/BiliUser.ts";
import type { BiliVideo } from "./bilibili/BiliVideo.ts";
import type { BiliGuardState } from "./bililive/index.ts";
import { getDBInstance } from "./db/index.ts";
import type { DouyinUser } from "./douyin/index.ts";
import type { NeteaseMusicUser } from "./netease-music/index.ts";
import type { ReckfengData } from "./reckfeng/index.ts";
import { WeiboMsg, WeiboUser, type OnlineData } from "./weibo/index.ts";
import type { WeiboComment } from "./weibo/comment.ts";

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
    reckfeng: ReckfengDBs
    rednote: RednoteDBs
    constructor(db: Db, weibo: WeiboDBs, apex: ApexDBs, bililive: BiliLiveDBs, bilibili: BilibiliDBs, douyin: DouyinDBs, netease_music: NeteaseMusicDBs, reckfeng: ReckfengDBs, rednote: RednoteDBs) {
        super(db)
        this.weibo = weibo
        this.apex = apex
        this.bililive = bililive
        this.bilibili = bilibili
        this.douyin = douyin
        this.netease_music = netease_music
        this.reckfeng = reckfeng
        this.rednote = rednote
    }
    static async getInstance(client: MongoClient) {
        return new this(client.db('main'),
            await getDBInstance(client, WeiboDBs),
            await getDBInstance(client, ApexDBs),
            await getDBInstance(client, BiliLiveDBs),
            await getDBInstance(client, BilibiliDBs),
            await getDBInstance(client, DouyinDBs),
            await getDBInstance(client, NeteaseMusicDBs),
            await getDBInstance(client, ReckfengDBs),
            await getDBInstance(client, RednoteDBs),
        )
    }
}

export class WeiboDBs extends EventDBs {
    static dbname = 'weibo'
    static collList = ['mblogs', 'users']
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
    static collList = ['userinfo']
    userinfoDB: Collection<ApexUserInfo>
    constructor(db: Db) {
        super(db)
        this.userinfoDB = db.collection<ApexUserInfo>('userinfo')
    }
}

export class BiliLiveDBs extends EventDBs {
    static dbname = 'bililive'
    static collList = []
    guardDB: Collection<BiliGuardState>
    constructor(db: Db) {
        super(db)
        this.guardDB = db.collection<BiliGuardState>('guard')
    }
}

export class DouyinDBs extends EventDBs {
    static dbname = 'douyin'
    static collList = ['users']
    userDB: Collection<DouyinUser>
    constructor(db: Db) {
        super(db)
        this.userDB = db.collection<DouyinUser>('users')
    }
}

export class NeteaseMusicDBs extends EventDBs {
    static dbname = 'netease-music'
    static collList = ['users']
    userDB: Collection<NeteaseMusicUser>
    constructor(db: Db) {
        super(db)
        this.userDB = db.collection<NeteaseMusicUser>('users')
    }
}

export class BilibiliDBs extends EventDBs {
    static dbname = 'bilibili'
    static collList = ['users']
    userDB: Collection<BiliUser>
    coinDB: Collection<BiliVideo>
    likeDB: Collection<BiliVideo>
    dynamicDB: Collection<BiliDynamic>
    constructor(db: Db) {
        super(db)
        this.userDB = db.collection<BiliUser>('users')
        this.coinDB = db.collection<BiliVideo>('coin')
        this.likeDB = db.collection<BiliVideo>('like')
        this.dynamicDB = db.collection<BiliDynamic>('dynamic')
    }
}

export class ReckfengDBs extends EventDBs {
    static dbname = 'reckfeng'
    static collList = ['users']
    userDB: Collection<ReckfengData>
    constructor(db: Db) {
        super(db)
        this.userDB = db.collection<ReckfengData>('users')
    }
}

export class RednoteDBs extends EventDBs {
    static dbname = 'rednote'
    static collList = ['users']
    userDB: Collection<RednoteUser>
    notesDB: Collection<RednoteNote>
    notesDetailDB: Collection<RednoteNoteDetail>
    commentsDB: Collection<RednoteComment>
    constructor(db: Db) {
        super(db)
        this.userDB = db.collection<RednoteUser>('users')
        this.notesDB = db.collection<RednoteNote>('notes')
        this.notesDetailDB = db.collection<RednoteNoteDetail>('notes_detail')
        this.commentsDB = db.collection<RednoteComment>('comments')
    }
}
