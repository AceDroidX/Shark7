import axios from "axios"
import logger from "shark7-shared/dist/logger"
import { Web } from "./Web"
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36'

export class WeiboHTTP {
    static web: Web

    static async getURL(url: string) {
        if (this.web == undefined) {
            logger.error("WeiboHTTP.getURL: wp is undefined")
        }
        return await axios.get(url, { headers: { 'User-Agent': UA, 'cookie': await this.web.getCookieStr() } })
    }
}