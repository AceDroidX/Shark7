import type { ChangeStreamDocument, ChangeStreamInsertDocument } from "mongodb";
import type { LogEvent, Shark7Event } from "shark7-shared";
import { logLevelToScope, logger } from "shark7-shared";
import { FcmClient } from "./fcm/index.ts";
import { sendMsgToFcmByScope, sendMsgToKHLByScope } from "./sendMsg.ts";

export class EventProcessor {
    fcm?: FcmClient
    constructor(fcm?: FcmClient) {
        this.fcm = fcm
    }

    sendEvent(event: Shark7Event) {
        sendMsgToKHLByScope(event)
        if (this.fcm) sendMsgToFcmByScope(event, this.fcm)
    }

    onNatsEvent(event: Shark7Event) {
        logger.info(`(${event.scope})接收到NATS事件: ${event.name}`)
        this.sendEvent(event)
    }

    onLogEvent(log: LogEvent) {
        const scope = logLevelToScope(log.level)
        const event: Shark7Event = { 
            ts: Number(log.timestamp), 
            name: 'Log', 
            scope, 
            msg: log.message 
        }
        logger.info(`(${scope})接收到日志事件: ${log.message}`)
        this.sendEvent(event)
    }
}
