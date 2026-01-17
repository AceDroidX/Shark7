import { MongoControllerBase, MongoDBs, logger, Shark7EventPublisher } from "shark7-shared";
import type { NatsConnection } from "@nats-io/transport-node";
import { EventProcessor } from "./event.ts";
import { Shark7EventSubscriber } from "shark7-shared";

export class MongoController extends MongoControllerBase<MongoDBs> {
    ep: EventProcessor
    nc: NatsConnection
    subscriber: Shark7EventSubscriber
    
    constructor(eventProcessor: EventProcessor, dbs: MongoDBs, eventPublisher: Shark7EventPublisher, nc: NatsConnection) {
        super(dbs, eventPublisher)
        this.ep = eventProcessor
        this.nc = nc
        this.subscriber = new Shark7EventSubscriber(this.nc)
    }
    
    async subscribeEvents() {
        await this.subscriber.subscribeShark7Event((event) => {
            this.ep.onNatsEvent(event)
        })
        
        await this.subscriber.subscribeLogEvent((log) => {
            this.ep.onLogEvent(log)
        })
        
        logger.info('所有NATS事件订阅已启动')
    }
}
