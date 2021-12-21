import axios from "axios";
import { KHLAPIPREFIX } from "./constants";
import config from "./config";
import logger from "./logger";
import { MsgType } from "./model/model";
export {
    sendMsg,
    sendLogToKHL,
    timePrefix,
    logAxiosError,
    logError,
    getTime,
    cookieStrToJson,
    cookieJsonToStr
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
        return await Promise.all([sendToKHL(msg, msg_channel_id[0]), sendToKHL(msg, msg_channel_id[1])])
    } else {
        return await sendToKHL(msg, msg_channel_id[0])
    }
}

async function sendLogToKHL(log: string) {
    return await sendToKHL(log, config.getStr('khl_log_channel_id'))
}

async function sendToKHL(msg: string, target_id: string) {
    try {
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

function logAxiosError(error: any) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.debug(error.response.data);
        logger.debug(error.response.status);
        logger.debug(error.response.headers);
    } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.debug(error.request);
    } else {
        // Something happened in setting up the request that triggered an Error
        logger.debug('Error', error.message);
    }
    logger.debug(error.config);
}

function logError(msg: string, error: any) {
    logger.error(`${msg}\nname:${error.name}\nmessage:${error.message}\nstack:${error.stack}`)
}

function cookieStrToJson(source: string) {
    if (source == '') return []
    return source.replace(/; /g, ';').replace(/;$/g, '').split(';').map(item => {
        var name = item.match(/^.*?(?==)/)
        var value = item.match(/(?<==)(.*)$/)
        if (name == null || value == null) {
            throw new Error('cookie格式错误')
        }
        return {
            name: name[0], value: value[0], domain: 'weibo.com'
        }
    })
}
function cookieJsonToStr(source: any) {
    var result = ''
    source.forEach((element: any) => {
        result += `${element['name']}=${element['value']};`
    });
    return result.replace(/;$/g, '')
}