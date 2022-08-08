import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument, Collection, Db, MongoClient } from "mongodb";
import { getDBInstance } from ".";
import { Shark7Event, UpdateTypeDoc } from "..";
import { EventDBs } from "../database";
import logger from "../logger";
import { logErrorDetail } from "../utils";

export class MongoControlClient<E extends EventDBs, C extends MongoControllerBase<E>> {
    client: MongoClient;
    ctr: C;
    constructor(client: MongoClient, ctr: C) {
        this.client = client;
        this.ctr = ctr;
    }
    static getMongoClientConfig() {
        return new MongoClient(
            process.env.NODE_ENV == 'production'
                ? `mongodb://admin:${process.env.MONGODB_PASS}@${process.env.MONGODB_IP}:27017/?authMechanism=DEFAULT`
                : 'mongodb://admin:admin@localhost:27017/', { retryReads: true, retryWrites: true }
        );
    }
    static async getInstance<E extends EventDBs, C extends MongoControllerBase<E>>(dbfunc: {
        dbname: string, postCollList: string[], new(db: Db): E
    }, ctrfunc: { new(dbs: E): C; }) {
        try {
            const client = await this.getMongoClientConfig().connect();
            const dbs = await getDBInstance(client, dbfunc)
            const ctr = new ctrfunc(dbs);
            logger.info('数据库已连接');
            return new this(client, ctr);
        } catch (err) {
            logErrorDetail('数据库连接失败', err);
            process.exit(1);
        }
    }
    async close() {
        await this.client.close();
    }
    async addShark7Event(event: Shark7Event) {
        await this.ctr.addShark7Event(event);
    }
    addInsertChangeWatcher<T>(db: Collection<T>,
        onInsert: { (ctr: C, event: ChangeStreamInsertDocument<T>): Promise<Shark7Event | null>; },
        onUpdate?: { (ctr: C, event: ChangeStreamUpdateDocument<T>): Promise<Shark7Event | null>; }
    ) {
        db.watch([], { fullDocument: 'updateLookup' }).on("change", async (event) => {
            if (event.operationType == 'insert') {
                const result = await onInsert(this.ctr, event);
                if (result)
                    await this.addShark7Event(result);
            } else if (event.operationType == 'update') {
                let isrealchange = false;
                for (const field in event.updateDescription.updatedFields) {
                    if (!field.startsWith('shark7_') && !field.startsWith('_')) { isrealchange = true; break; }
                }
                if (isrealchange) {
                    if (onUpdate) {
                        const result = await onUpdate(this.ctr, event);
                        if (result)
                            await this.addShark7Event(result);
                    }
                    else
                        logger.warn(`insert数据更新\n${JSON.stringify(event)}`);
                }
            } else {
                logger.warn(`insert数据未知operationType:${event.operationType}`);
                return;
            }
        });
    }
    addUpdateChangeWatcher<T extends UpdateTypeDoc>(db: Collection<T>,
        onUpdate: { (ctr: C, event: ChangeStreamUpdateDocument<T>, origin?: T): Promise<Shark7Event | null>; }
    ) {
        db.watch([], { fullDocument: 'updateLookup', fullDocumentBeforeChange: 'whenAvailable' }).on("change", async (event) => {
            if (event.operationType == 'insert') {
                logger.info(`update数据添加: \n${JSON.stringify(event)}`);
            } else if (event.operationType == 'update') {
                if (!event.fullDocument) {
                    logger.error(`update数据无fullDocument: \n${JSON.stringify(event)}`);
                    return;
                }
                const result = await onUpdate(this.ctr, event, event.fullDocumentBeforeChange);
                if (result) await this.addShark7Event(result);
            } else {
                logger.warn(`update数据未知operationType:${event.operationType}`);
                return;
            }
        });
    }
}

export class MongoControllerBase<T extends EventDBs> {
    dbs: T;
    constructor(dbs: T) {
        this.dbs = dbs;
    }
    async addShark7Event(event: Shark7Event) {
        await this.dbs.event.insertOne(event);
    }
}
