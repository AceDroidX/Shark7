import { ChangeStreamDocument, ChangeStreamInsertDocument } from "mongodb";
import { LogEvent, Shark7Event } from "shark7-shared";
import logger from "shark7-shared/dist/logger";
import { logLevelToScope } from 'shark7-shared/dist/scope';
import { FcmClient } from "./fcm";
import { sendMsgToFcmByScope, sendMsgToKHLByScope } from "./sendMsg";

export class EventProcessor {
    fcm?: FcmClient
    constructor(fcm?: FcmClient) {
        this.fcm = fcm
    }

    sendEvent(event: Shark7Event) {
        sendMsgToKHLByScope(event)
        if (this.fcm) sendMsgToFcmByScope(event, this.fcm)
    }

    onEventChange(raw: ChangeStreamDocument) {
        if (raw.operationType != 'insert') {
            logger.warn(`未知事件操作:${raw.operationType}`)
            return
        }
        const event = raw as ChangeStreamInsertDocument<Shark7Event>
        logger.info(`(${event.fullDocument.scope})事件改变: \n${JSON.stringify(raw)}`)
        this.sendEvent(event.fullDocument)
    }

    onLogChange(raw: ChangeStreamDocument, collName: string) {
        if (raw.operationType != 'insert') {
            logger.warn(`未知事件操作:${raw.operationType}`)
            return
        }
        const event = raw as ChangeStreamInsertDocument<LogEvent>
        const log = event.fullDocument
        this.sendEvent({ ts: Number(new Date()), name: collName, scope: logLevelToScope(log.level), msg: log.message })
    }
}
