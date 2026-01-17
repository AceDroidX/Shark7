import axios from "axios";
import type { Shark7Event } from "shark7-shared";
import { getScopeName, getTime, loggerEventSender } from "shark7-shared";

export async function sendEventToNtfy(event: Shark7Event, channel: string) {
    let scopename = getScopeName(event.scope)
    if (!scopename) {
        loggerEventSender.warn(`未知scopename:${event}`)
        scopename = event.scope
    }
    const msg = `[${getTime(event.ts)}]<${event.name}>(${scopename})\n${event.msg}`
    sendToNtfy(msg, channel)
}

export async function sendToNtfy(msg: string, channel: string) {
    if (!process.env['ntfy_url']) {
        loggerEventSender.error('ntfy_url未设置')
        process.exit(1)
    }
    try {
        loggerEventSender.info(`发送ntfy消息<${channel}>: ${msg}`)
        await axios.post(`${process.env['ntfy_url']}/${channel}`, msg, {
            headers: {
                'Content-Type': 'text/plain',
            }
        })
    } catch (error) {
        loggerEventSender.warn(`ntfy消息发送错误：\n${JSON.stringify(error)}`);
    };
}