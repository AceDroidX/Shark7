import logger from "./logger";
export {
    timePrefix,
    logAxiosError,
    logErrorDetail,
    logError,
    logWarn,
    getTime
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

function logErrorDetail(msg: string, error: any) {
    logger.error(`${msg}\nname:${error.name}\nmessage:${error.message}\nstack:${error.stack}`)
}
function logError(msg: string, error: any) {
    logger.error(`${msg}\nname:${error.name}\nmessage:${error.message}`)
}
function logWarn(msg: string, error: any){
    logger.warn(`${msg}\nname:${error.name}\nmessage:${error.message}`)
}