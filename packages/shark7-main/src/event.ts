import { ChangeStreamDocument, ChangeStreamInsertDocument } from "mongodb";
import { Shark7Event } from "shark7-shared";
import { getScopeName } from 'shark7-shared/dist/scope'
import logger from "shark7-shared/dist/logger";
import { getTime } from "shark7-shared/dist/utils";
import { sendMsgWithScope } from "./sendMsg";

export function sendEvent(event: Shark7Event) {
    const scopename = getScopeName(event.scope)
    if (!scopename) {
        logger.warn(`未知scopename:${event}`)
    }
    const msg = `[${getTime(event.ts)}]<${event.name}>(${scopename})\n${event.msg}`
    sendMsgWithScope(msg, event.scope)
}

export function onEventChange(raw: ChangeStreamDocument) {
    if (raw.operationType != 'insert') {
        logger.warn(`未知事件操作:${raw.operationType}`)
        return
    }
    const event = raw as ChangeStreamInsertDocument<Shark7Event>
    logger.info(`(${event.fullDocument.scope})事件改变: \n${JSON.stringify(raw)}`)
    sendEvent(event.fullDocument)
}