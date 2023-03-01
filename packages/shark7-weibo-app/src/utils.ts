import axios, { AxiosRequestConfig } from "axios"
import { Protocol } from "puppeteer"
import { logger } from "shark7-shared"
import { logAxiosError, logErrorDetail } from "shark7-shared"
import { MongoController } from "./MongoController"

export function getReqConfig(mongo: MongoController, containerid: string): AxiosRequestConfig | undefined {
    if (!mongo.cookieCache) {
        logger.error('cookieCache为空')
        return
    }
    return {
        params: {
            c: 'android', lang: 'zh_CN',
            page: '1', count: '20',
            from: process.env['weibo_from'], s: process.env['weibo_s'], containerid: containerid,
            gsid: getCookieByKey(mongo.cookieCache, 'SUB')
        },
        headers: {
            authorization: `WB-SUT ${getCookieByKey(mongo.cookieCache, 'SUB')}`
        },
        transformResponse: (r) => r,
    }
}

export async function fetchURL(url: string, reqConfig: AxiosRequestConfig | undefined) {
    try {
        const resp = await axios.get(url, reqConfig)
        if (resp.status != 200) {
            logger.error(`抓取数据失败,状态码:${resp.status}\n${resp}`)
            return
        }
        const data = JSON.parse(resp?.data)
        return data
    } catch (error) {
        if (axios.isAxiosError(error)) {
            logger.warn('抓取数据失败:请求错误\n' + JSON.stringify(error.toJSON()))
        } else {
            logErrorDetail('抓取数据失败', error)
        }
        return
    }
}

function getCookieByKey(cookie: Protocol.Network.Cookie[], key: string): string | undefined {
    for (const item of cookie) {
        if (item.name == key) {
            return item.value
        }
    }
}
