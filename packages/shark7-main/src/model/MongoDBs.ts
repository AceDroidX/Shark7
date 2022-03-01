import { Collection } from "mongodb";

export class MongoDBs {
    weibo: {
        mblogsDB: Collection
        userDB: Collection
    }
    apex: {
        userinfoDB: Collection
    }
    constructor(dbs: {
        weibo: {
            mblogsDB: Collection
            userDB: Collection
        }
        apex: {
            userinfoDB: Collection
        }
    }) {
        this.weibo = dbs.weibo
        this.apex = dbs.apex
    }
}