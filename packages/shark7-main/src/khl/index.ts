import axios from "axios";
import config from "../config"
import { KHLAPIPREFIX } from "../constants";
import logger from "../logger";
import { MsgType } from "../model/model";

export {
    sendMsg,
    sendLogToKHL,
}

function isGolbalMsg(type: string) {
    switch (type) {
        case MsgType.weibo:
        case MsgType.live.Live:
            return true;
        default:
            return false;
    }
}

async function sendMsg(msg: string, type: string = 'msg') {
    if (config == undefined) {
        console.debug("config is undefined")
        return
    }
    const msg_channel_id = config.getStr("khl_msg_channel_id").split(',')
    if (isGolbalMsg(type)) {
        const promise_list = msg_channel_id.map(async (channel_id) => {
            sendToKHL(msg, channel_id)
        })
        return await Promise.all(promise_list)
    } else {
        return await sendToKHL(msg, msg_channel_id[0])
    }
}

async function sendLogToKHL(log: string) {
    return await sendToKHL(log, config.getStr('khl_log_channel_id'))
}

async function sendToKHL(msg: string, target_id: string) {
    try {
        logger.info(`发送开黑啦消息: ${msg}`)
        await axios.post(KHLAPIPREFIX + '/api/v3/message/create', {
            target_id: target_id,
            content: msg
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bot ' + config.get('khl_token')
            }
        })
    } catch (error) {
        logger.error(`开黑啦消息发送错误：\n${JSON.stringify(error)}`);
    };
}