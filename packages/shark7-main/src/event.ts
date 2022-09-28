import { ChangeStreamDocument, ChangeStreamInsertDocument } from "mongodb";
import { LogEvent, Shark7Event } from "shark7-shared";
import logger from "shark7-shared/dist/logger";
import { getScopeName, logLevelToScope } from 'shark7-shared/dist/scope';
import { getTime } from "shark7-shared/dist/utils";
import { sendMsgWithScope } from "./sendMsg";

export function sendEvent(event: Shark7Event) {
    let scopename = getScopeName(event.scope)
    if (!scopename) {
        logger.warn(`未知scopename:${event}`)
        scopename = event.scope
    }
    const msg = `[${getTime(event.ts)}]<${event.name}>(${scopename})\n${event.msg}`
    sendMsgWithScope(msg, event.name, event.scope, event.msg)
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

export function onLogChange(raw: ChangeStreamDocument, collName: string) {
    if (raw.operationType != 'insert') {
        logger.warn(`未知事件操作:${raw.operationType}`)
        return
    }
    const event = raw as ChangeStreamInsertDocument<LogEvent>
    const log = event.fullDocument
    sendEvent({ ts: Number(new Date()), name: collName, scope: logLevelToScope(log.level), msg: log.message })
}
