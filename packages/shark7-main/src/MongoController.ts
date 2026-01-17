import { MongoControllerBase, MongoDBs, logger } from "shark7-shared";
import type { NatsConnection } from "@nats-io/transport-node";
import { EventProcessor } from "./event.ts";
import { Shark7EventSubscriber } from "shark7-shared";

export {
    MongoController
};

class MongoController extends MongoControllerBase<MongoDBs> {
    ep: EventProcessor
    nc?: NatsConnection
    subscriber?: Shark7EventSubscriber
    
    constructor(eventProcessor: EventProcessor, dbs: MongoDBs, nc?: NatsConnection) {
        super(dbs)
        this.ep = eventProcessor
        this.nc = nc
    }
    
    async subscribeEvents() {
        if (!this.nc) {
            logger.error('NATS未连接，无法订阅事件')
            return
        }
        
        if (!this.subscriber) {
            this.subscriber = new Shark7EventSubscriber(this.nc)
        }
        
        await this.subscriber.subscribeShark7Event((event) => {
            this.ep.onNatsEvent(event)
        })
        
        await this.subscriber.subscribeLogEvent((log) => {
            this.ep.onLogEvent(log)
        })
        
        logger.info('所有NATS事件订阅已启动')
    }
}
