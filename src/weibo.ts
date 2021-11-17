import axios from "axios";
import { WeiboUser } from "./model/WeiboUser";
import { sendMsgToKHL, timePrefix } from "./utils";
import logger from "./logger";
import { refreshWeiboCookie } from "./puppeteer";

export class WeiboController {
    user: WeiboUser

    constructor(user: WeiboUser) {
        this.user = user;
    }
    static async getFromID(uid: number) {
        return new WeiboController(await WeiboUser.getFromID(uid));
    }
    fetchMblog() {
        logger.debug("开始抓取微博");
        this.user.checkAndGetNewMblogs().then(async (new_mblogs) => {
            for (const nmb of new_mblogs) {
                if (nmb.user.id != this.user.id) {
                    logger.info(`<${this.user.screen_name}>${nmb.title}:${nmb.user.screen_name}\n${nmb.text_raw}`)
                    sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>${nmb.title}:${nmb.user.screen_name}\n${nmb.text_raw}`)
                }
                else if (nmb.visible_type == 0) {
                    logger.info(`<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                    sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                } else if (nmb.visible_type == 10) {
                    logger.info(`<${this.user.screen_name}>微博仅粉丝可见动态\n${nmb.text_raw}`)
                    sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博仅粉丝可见动态\n${nmb.text_raw}`)
                } else {
                    logger.info(`<${this.user.screen_name}>微博动态(visible_type=${nmb.visible_type})\n${nmb.text_raw}`)
                    sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博动态(visible_type=${nmb.visible_type})\n${nmb.text_raw}`)
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }).catch(e => {
            if (e.status == 500) {
                logger.error(`抓取微博出错：\n${e.message}`);
            } else {
                logger.error(`抓取微博出错：\n${e}`);
            }
        })
    }
    fetchUserInfo() {
        logger.debug("开始抓取用户信息");
        this.user.checkAndGetUserInfo().then(async (user_info) => {
            for (const ui of user_info) {
                logger.info(`<${this.user.screen_name}>${ui}`)
                sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>${ui}`)
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }).catch(e => {
            if (e.status == 500) {
                logger.error(`抓取用户信息出错：\n${e.message}`);
            } else {
                logger.error(`抓取用户信息出错：\n${e}`);
            }
        })
    }
    public async run() {
        while (true) {
            refreshWeiboCookie()
            for (var i = 0; i < 60; i++) {
                this.fetchMblog()
                this.fetchUserInfo()
                await new Promise(resolve => setTimeout(resolve, 10 * 1000));
            }
        }
    }
}