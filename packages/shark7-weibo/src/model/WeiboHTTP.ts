import axios from "axios";
import { WeiboCookieMgr, cookieJsonToStr, logErrorDetail, logger } from "shark7-shared";
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36'

export class WeiboHTTP {
    wcm: WeiboCookieMgr
    constructor(wcm: WeiboCookieMgr) {
        this.wcm = wcm
    }
    async getURL<T = any>(url: string) {
        try {
            return await axios.get<T>(url, { headers: { 'User-Agent': UA, 'cookie': cookieJsonToStr(this.wcm.cookie) } })
        }
        catch (err) {
            if (axios.isAxiosError(err)) {
                logger.warn('抓取数据失败:请求错误\n' + JSON.stringify(err.toJSON()))
            } else {
                logErrorDetail('抓取数据失败', err)
            }
            return null
        }
    }
}
