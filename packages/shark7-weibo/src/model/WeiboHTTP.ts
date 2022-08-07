import axios from "axios"
import logger from "shark7-shared/dist/logger"
import { cookieJsonToStr } from "shark7-shared/dist/utils"
import { MongoController } from "../MongoController"
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36'

export class WeiboHTTP {
    mongo: MongoController

    constructor(mongo: MongoController) {
        this.mongo = mongo
    }

    async getURL<T = any>(url: string) {
        if (this.mongo.cookieCache == undefined) {
            logger.error("WeiboHTTP.getURL: cookieCache is undefined")
            process.exit(1)
        }
        return await axios.get<T>(url, { headers: { 'User-Agent': UA, 'cookie': cookieJsonToStr(this.mongo.cookieCache) } })
    }
}
