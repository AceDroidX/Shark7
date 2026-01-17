import { Collection, Db, MongoClient, type ChangeStreamInsertDocument, type ChangeStreamUpdateDocument, type Document } from "mongodb";
import { getDBInstance } from "./index.ts";
import type { Shark7Event, UpdateTypeDoc, LogEvent } from "../index.ts";
import { EventDBs } from "../database.ts";
import { logger } from "../logger.ts";
import { logErrorDetail } from "../utils.ts";
import type { NatsConnection } from "@nats-io/transport-node";
import { Shark7EventPublisher } from "../nats.ts";

export class MongoControlClient<E extends EventDBs, C extends MongoControllerBase<E>> {
    client: MongoClient;
    ctr: C;
    eventPublisher?: Shark7EventPublisher;
    constructor(client: MongoClient, ctr: C, eventPublisher?: Shark7EventPublisher) {
        this.client = client;
        this.ctr = ctr;
        this.eventPublisher = eventPublisher;
    }
    static getMongoClientConfig() {
        return new MongoClient(`mongodb://admin:${process.env.MONGODB_PASS ?? 'admin'}@${process.env.MONGODB_IP ?? '127.0.0.1'}:27017/?authMechanism=DEFAULT`, { retryReads: true, retryWrites: true });
    }
    static async getInstance<E extends EventDBs, C extends MongoControllerBase<E>>(dbfunc: {
        dbname: string, postCollList: string[], new(db: Db): E
    }, ctrfunc: { new(dbs: E): C; }, nc?: NatsConnection) {
        try {
            const client = this.getMongoClientConfig();
            client.on('serverHeartbeatFailed', event => { logger.warn(`serverHeartbeatFailed: ${JSON.stringify(event)}`); });
            const dbs = await getDBInstance(client, dbfunc)
            const ctr = new ctrfunc(dbs);
            logger.info('数据库已连接');
            
            const eventPublisher = nc ? new Shark7EventPublisher(nc) : undefined
            if (eventPublisher) {
                ctr.eventPublisher = eventPublisher
            }
            return new this(client, ctr, eventPublisher);
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
    async publishShark7Event(event: Shark7Event) {
        if (this.eventPublisher) {
            const success = await this.eventPublisher.publish(event)
            if (!success) {
                logger.warn('NATS发布失败，回退到数据库')
                await this.ctr.addShark7Event(event)
            }
        } else {
            await this.ctr.addShark7Event(event)
        }
    }
    async publishLogEvent(event: LogEvent) {
        if (this.eventPublisher) {
            const success = await this.eventPublisher.publish(event)
            if (!success) {
                logger.warn('NATS发布失败，LogEvent不写入数据库')
            }
        }
    }
    addInsertChangeWatcher<T extends Document, E>(db: Collection<T>,
        onInsert: { (ctr: C, event: ChangeStreamInsertDocument<T>, extra?: E): Promise<Shark7Event | null>; },
        onUpdate?: { (ctr: C, event: ChangeStreamUpdateDocument<T>, extra?: E): Promise<Shark7Event | null>; },
        extra?: E
    ) {
        logger.info(`添加InsertChangeWatcher db:${db.dbName}.${db.collectionName} onInsert:${onInsert.name} onUpdate:${onUpdate?.name}`)
        const changeStream = db.watch([], { fullDocument: 'updateLookup' })
        changeStream.on('close', (event: any) => {
            logger.warn(`changeStream.close: ${JSON.stringify(event)}`)
            // this.addInsertChangeWatcher(db, onInsert, onUpdate)
        })
        changeStream.on('end', (event: any) => { logger.warn(`changeStream.end: ${JSON.stringify(event)}`) })
        changeStream.on('error', (event: any) => { logger.warn(`changeStream.error: ${JSON.stringify(event)}`) })
        changeStream.on('change', async (event) => {
            if (event.operationType == 'insert') {
                const result = extra ? await onInsert(this.ctr, event, extra) : await onInsert(this.ctr, event)
                if (result)
                    await this.publishShark7Event(result);
            } else if (event.operationType == 'update') {
                let isrealchange = false;
                for (const field in event.updateDescription.updatedFields) {
                    if (!field.startsWith('shark7_') && !field.startsWith('_')) { isrealchange = true; break; }
                }
                if (isrealchange) {
                    if (onUpdate) {
                        const result = extra ? await onUpdate(this.ctr, event, extra) : await onUpdate(this.ctr, event)
                        if (result)
                            await this.publishShark7Event(result);
                    }
                    else
                        logger.debug(`insert数据更新\n${JSON.stringify(event)}`);
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
        logger.info(`添加UpdateChangeWatcher db:${db.dbName}.${db.collectionName} onUpdate:${onUpdate.name}`)
        const changeStream = db.watch([], { fullDocument: 'updateLookup', fullDocumentBeforeChange: 'whenAvailable' })
        changeStream.on('close', (event: any) => {
            logger.warn(`changeStream.close: ${JSON.stringify(event)}`)
            // this.addUpdateChangeWatcher(db, onUpdate)
        })
        changeStream.on('end', (event: any) => { logger.warn(`changeStream.end: ${JSON.stringify(event)}`) })
        changeStream.on('error', (event: any) => { logger.warn(`changeStream.error: ${JSON.stringify(event)}`) })
        changeStream.on('change', async (event) => {
            if (event.operationType == 'insert') {
                logger.info(`update数据添加: \n${JSON.stringify(event)}`);
            } else if (event.operationType == 'update') {
                if (!event.fullDocument) {
                    logger.error(`update数据无fullDocument: \n${JSON.stringify(event)}`);
                    return;
                }
                const result = await onUpdate(this.ctr, event, event.fullDocumentBeforeChange);
                if (result) await this.publishShark7Event(result);
            } else {
                logger.warn(`update数据未知operationType:${event.operationType}`);
                return;
            }
        });
    }
}

export class MongoControllerBase<T extends EventDBs> {
    dbs: T;
    eventPublisher?: Shark7EventPublisher;
    constructor(dbs: T, eventPublisher?: Shark7EventPublisher) {
        this.dbs = dbs;
        this.eventPublisher = eventPublisher;
    }
    async addShark7Event(event: Shark7Event) {
        await this.dbs.event.insertOne(event);
    }
    async publishShark7Event(event: Shark7Event) {
        if (this.eventPublisher) {
            const success = await this.eventPublisher.publish(event)
            if (!success) {
                logger.warn('NATS发布失败，回退到数据库')
                await this.addShark7Event(event)
            }
        } else {
            await this.addShark7Event(event)
        }
    }
}
