import { Collection, Db, MongoClient, type Document } from "mongodb";
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
    eventPublisher: Shark7EventPublisher;
    constructor(client: MongoClient, ctr: C, eventPublisher: Shark7EventPublisher) {
        this.client = client;
        this.ctr = ctr;
        this.eventPublisher = eventPublisher;
    }
    static getMongoClientConfig() {
        return new MongoClient(`mongodb://admin:${process.env.MONGODB_PASS ?? 'admin'}@${process.env.MONGODB_IP ?? '127.0.0.1'}:27017/?authMechanism=DEFAULT`, { retryReads: true, retryWrites: true });
    }
    static async getInstance<E extends EventDBs, C extends MongoControllerBase<E>>(dbfunc: {
        dbname: string, collList: string[], new(db: Db): E
    }, ctrfunc: { new(dbs: E, eventPublisher: Shark7EventPublisher): C; }, nc: NatsConnection) {
        try {
            const client = this.getMongoClientConfig();
            client.on('serverHeartbeatFailed', event => { logger.warn(`serverHeartbeatFailed: ${JSON.stringify(event)}`); });
            const dbs = await getDBInstance(client, dbfunc)
            const eventPublisher = new Shark7EventPublisher(nc)
            const ctr = new ctrfunc(dbs, eventPublisher);
            logger.info('数据库已连接');
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
        await this.addShark7Event(event)
        if (this.eventPublisher) {
            await this.eventPublisher.publish(event)
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
}

export class MongoControllerBase<T extends EventDBs> {
    dbs: T;
    eventPublisher: Shark7EventPublisher;
    constructor(dbs: T, eventPublisher: Shark7EventPublisher) {
        this.dbs = dbs;
        this.eventPublisher = eventPublisher;
    }
    async addShark7Event(event: Shark7Event) {
        await this.dbs.event.insertOne(event);
    }
    async publishShark7Event(event: Shark7Event) {
        await this.addShark7Event(event)
        if (this.eventPublisher) {
            await this.eventPublisher.publish(event)
        }
    }
}
