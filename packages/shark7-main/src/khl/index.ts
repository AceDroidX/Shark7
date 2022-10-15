import axios from "axios";
import { Shark7Event } from "shark7-shared";
import logger from "shark7-shared/dist/logger";
import { getScopeName } from "shark7-shared/dist/scope";
import { getTime } from "shark7-shared/dist/utils";
import { KHLAPIPREFIX } from "../constants";

// async function sendLogToKHL(log: string) {
//     if (!process.env['khl_log_channel_id']) {
//         logger.error('khl_log_channel_id')
//         process.exit(1)
//     }
//     return await sendToKHL(log, process.env['khl_log_channel_id'])
// }

export async function sendEventToKHL(event: Shark7Event, target_id: string) {
    let scopename = getScopeName(event.scope)
    if (!scopename) {
        logger.warn(`未知scopename:${event}`)
        scopename = event.scope
    }
    const msg = `[${getTime(event.ts)}]<${event.name}>(${scopename})\n${event.msg}`
    sendToKHL(msg, target_id)
}

export async function sendToKHL(msg: string, target_id: string) {
    if (!process.env['khl_token']) {
        logger.error('khl_token未设置')
        process.exit(1)
    }
    try {
        logger.info(`发送开黑啦消息<${target_id}>: ${msg}`)
        await axios.post(KHLAPIPREFIX + '/api/v3/message/create', {
            target_id: target_id,
            content: msg
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bot ' + process.env['khl_token']
            }
        })
    } catch (error) {
        logger.error(`开黑啦消息发送错误：\n${JSON.stringify(error)}`);
    };
}
