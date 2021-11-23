import axios from "axios";
import { WeiboUser } from "./model/WeiboUser";
import { sendMsgToKHL, timePrefix } from "./utils";
import logger from "./logger";
import { WeiboPuppeteer } from "./puppeteer";
import { WeiboHTTP } from "./model/WeiboHTTP";

export class WeiboController {
    static wc: WeiboController;

    user: WeiboUser
    wp: WeiboPuppeteer

    constructor(user: WeiboUser, wp: WeiboPuppeteer) {
        this.user = user;
        this.wp = wp;
    }
    static async init(uid: number) {
        if (this.wc != undefined) {
            return this.wc;
        }
        const wp = await WeiboPuppeteer.getInstance()
        WeiboHTTP.wp = wp;
        await wp.refreshWeiboCookie()
        return new WeiboController(await WeiboUser.getFromID(uid), wp);
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
                    if (nmb.repost_type == 1) {
                        logger.info(`<${this.user.screen_name}>微博转发\n${nmb.text_raw}\n原动态\n`)
                        sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博转发\n${nmb.text_raw}`)
                    } else {
                        logger.info(`<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                        sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                    }
                } else if (nmb.visible_type == 10) {
                    if (nmb.repost_type == 1) {
                        logger.info(`<${this.user.screen_name}>微博仅粉丝可见转发\n${nmb.text_raw}原动态\n`)
                        sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博仅粉丝可见转发\n${nmb.text_raw}`)
                    } else {
                        logger.info(`<${this.user.screen_name}>微博仅粉丝可见动态\n${nmb.text_raw}`)
                        sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博仅粉丝可见动态\n${nmb.text_raw}`)
                    }
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
            for (var i = 0; i < 60; i++) {
                this.fetchMblog()
                this.fetchUserInfo()
                await new Promise(resolve => setTimeout(resolve, 10 * 1000));
            }
            await this.wp.refreshWeiboCookie()
        }
    }
}