import axios, { AxiosRequestConfig } from "axios"
import { Protocol } from "puppeteer"
import { logErrorDetail, logger } from "shark7-shared"

export function getReqConfig(cookie: Protocol.Network.Cookie[], containerid: string): AxiosRequestConfig | undefined {
    return {
        params: {
            c: 'android', lang: 'zh_CN',
            page: '1', count: '20',
            from: process.env['weibo_from'], s: process.env['weibo_s'], containerid: containerid,
            gsid: getCookieByKey(cookie, 'SUB')
        },
        headers: {
            authorization: `WB-SUT ${getCookieByKey(cookie, 'SUB')}`
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
