import axios from "axios";
import { WeiboCookieMgr, cookieJsonToStr, logErrorDetail, logger } from "shark7-shared";
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Trailer/93.3.3570.29'

export class WeiboHTTP {
    wcm: WeiboCookieMgr
    constructor(wcm: WeiboCookieMgr) {
        this.wcm = wcm
    }
    async getURL<T = any>(url: string) {
        try {
            return await axios.get<T>(url, { headers: { "Referer": "https://weibo.com", 'User-Agent': UA, 'cookie': cookieJsonToStr(this.wcm.cookie), 'X-XSRF-TOKEN': this.wcm.cookie.find(cookie => cookie.name === 'XSRF-TOKEN')?.value } })
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
