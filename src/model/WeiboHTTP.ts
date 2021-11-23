import axios from "axios"
import logger from "../logger"
import { WeiboPuppeteer } from "../puppeteer"
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36'

export class WeiboHTTP {
    static wp: WeiboPuppeteer

    static async getURL(url: string) {
        if (this.wp == undefined) {
            logger.error("WeiboHTTP.getURL: wp is undefined")
        }
        return await axios.get(url, { headers: { 'User-Agent': UA, 'cookie': await this.wp.getCookieStr() } })
    }
}