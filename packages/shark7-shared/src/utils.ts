import logger from "./logger";

export {
    timePrefix,
    logAxiosError,
    logErrorDetail,
    logError,
    logWarn,
    getTime,
    cookieStrToJson,
    cookieJsonToStr,
    delay,
    toNumOrStr
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function timePrefix() {
    return `[${getTime()}]`
}
//get time 
function getTime(timestamp?: number, withMiliSecond?: boolean) {
    let hasMilliSeconds = true
    let now
    if (timestamp === undefined) {
        now = new Date()
    } else {
        if (timestamp.toString().length === 10) {
            timestamp = timestamp * 1000
            hasMilliSeconds = false
        }
        now = new Date(timestamp)
    }
    const year = now.getFullYear()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const day = now.getDate().toString().padStart(2, '0')
    const hour = now.getHours().toString().padStart(2, '0')
    const minute = now.getMinutes().toString().padStart(2, '0')
    const second = now.getSeconds().toString().padStart(2, '0')
    const milli = now.getMilliseconds().toString().padStart(3, '0')
    let time
    if (withMiliSecond) {
        time = `${year}-${month}-${day} ${hour}:${minute}:${second}.${milli}`
    } else {
        time = `${year}-${month}-${day} ${hour}:${minute}:${second}`
    }
    return time
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
        logger.debug(JSON.stringify(error.response.headers));
    } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.debug(error.request);
    } else {
        // Something happened in setting up the request that triggered an Error
        logger.debug('Error', error.message);
    }
    logger.debug(JSON.stringify(error.config));
}

function logErrorDetail(msg: string, error: any) {
    logger.error(`${msg}\nname:${error.name}\nmessage:${error.message}\nstack:${error.stack}`)
}
function logError(msg: string, error: any) {
    logger.error(`${msg}\nname:${error.name}\nmessage:${error.message}`)
}
function logWarn(msg: string, error: any) {
    logger.warn(`${msg}\nname:${error.name}\nmessage:${error.message}`)
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

function toNumOrStr(source: any) {
    var n = Number(source)
    if (isNaN(n)) {
        return source
    } else {
        return n
    }
}