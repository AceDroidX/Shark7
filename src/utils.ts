import axios from "axios";
import { KHLAPIPREFIX } from "./constants";
import config from "./config";
import logger from "./logger";
export {
    sendMsgToKHL,
    sendLogToKHL,
    timePrefix,
    getTime
}

async function sendMsgToKHL(msg: string) {
    return await sendToKHL(msg, 'msg')
}

async function sendLogToKHL(log: string) {
    return await sendToKHL(log, 'log')
}

async function sendToKHL(msg: string, type: string = 'msg') {
    if (config == undefined) {
        console.debug("config is undefined")
        return
    }
    try {
        if (type == 'log') {
            var target_id = config.get('khl_log_channel_id')
        } else {
            var target_id = config.get('khl_msg_channel_id')
        }
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

function timePrefix() {
    return `[${getTime()}]`
}
//get time 
function getTime(timestamp = undefined) {
    if (timestamp === undefined) {
        var now = new Date();
    } else {
        var now = new Date(timestamp);
    }
    var year = now.getFullYear();
    var month = (now.getMonth() + 1).toString().padStart(2, '0');
    var day = now.getDate().toString().padStart(2, '0');
    var hour = now.getHours().toString().padStart(2, '0');
    var minute = now.getMinutes().toString().padStart(2, '0');
    var second = now.getSeconds().toString().padStart(2, '0');
    var milli = now.getMilliseconds().toString().padStart(3, '0');
    var time = year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second + '.' + milli;
    return time;
}

function isValidKey(key: string | number | symbol, object: object): key is keyof typeof object {
    return key in object;
}