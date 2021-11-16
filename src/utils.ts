import axios from "axios";
import { KHLAPIPREFIX } from "./constants";
import config from "./config";
import logger from "./logger";
export {
    sendMsgToKHL,
    timePrefix
}

function sendMsgToKHL(msg: string) {
    if(config==undefined){
        console.debug("config is undefined")
        return
    }
    axios.post(KHLAPIPREFIX + '/api/v3/message/create', {
        target_id: config.get('channel_id'),
        content: msg
    }, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bot ' + config.get('khl_token')
        }
    })
        .then(function (response) {
            // logger.debug(response);
        })
        .catch(function (error) {
            logger.error(error);
        });
}

function timePrefix() {
    return `[${getTime()}]`
}
//get time 
function getTime(timestamp = undefined) {
    if (timestamp === undefined) {
        var now = new Date();
    }else{
        var now = new Date(timestamp);
    }
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var day = now.getDate();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    var milli = now.getMilliseconds();
    var time = year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
    return time;
}

function isValidKey(key: string | number | symbol, object: object): key is keyof typeof object {
    return key in object;
}