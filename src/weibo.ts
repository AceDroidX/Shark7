import axios from "axios";
import { WeiboUser } from "./model/WeiboUser";
import { sendMsgToKHL, timePrefix } from "./utils";
import logger from "./logger";

export class WeiboController {
    user: WeiboUser

    constructor(user: WeiboUser) {
        this.user = user;
    }
    static async getFromID(uid: number) {
        return new WeiboController(await WeiboUser.getFromID(uid));
    }
    async fetchMblog() {
        logger.debug(timePrefix() + "开始抓取微博");
        this.user.checkAndGetNewMblogs().then(async (new_mblogs) => {
            for (const nmb of new_mblogs) {
                logger.info(`<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }).catch(e => {
            logger.error(timePrefix() + "抓取微博出错");
            logger.error(e);
        })
    }
    async fetchUserInfo() {
        logger.debug(timePrefix() + "开始抓取用户信息");
        this.user.checkAndGetUserInfo().then(async (user_info) => {
            logger.info(`<${this.user.screen_name}>的信息\n${user_info}`)
            sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>的信息\n${user_info}`)
            await new Promise(resolve => setTimeout(resolve, 100));
        }).catch(e => {
            logger.error(timePrefix() + "抓取用户信息出错");
            logger.error(e);
        })
    }
    public async run() {
        while (true) {
            await this.fetchMblog()
            await new Promise(resolve => setTimeout(resolve, 10 * 1000));
        }
    }
}