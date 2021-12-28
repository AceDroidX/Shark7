import { WeiboUser } from "../model/WeiboUser";
import { logAxiosError, logError, logErrorDetail, logWarn, sendMsg, timePrefix } from "../utils";
import logger from "../logger";
import { WeiboHTTP } from "../model/WeiboHTTP";
import { MsgType } from "../model/model";
import { Web } from "../model/Web";
import { Puppeteer } from "../puppeteer";

export class WeiboController {
    static wc: WeiboController;

    user: WeiboUser
    weiboWeb: Web

    constructor(user: WeiboUser, weiboWeb: Web) {
        this.user = user;
        this.weiboWeb = weiboWeb;
    }
    static async init(uid: number) {
        if (this.wc != undefined) {
            return this.wc;
        }
        const weiboWeb = await (await Puppeteer.getInstance()).weiboweb
        WeiboHTTP.web = weiboWeb;
        await weiboWeb.refresh()
        this.wc = new WeiboController(await WeiboUser.getFromID(uid), weiboWeb)
        return this.wc;
    }
    async fetchMblog() {
        logger.debug("开始抓取微博");
        let new_mblogs
        try {
            new_mblogs = await this.user.checkAndGetNewMblogs()
        } catch (e: any) {
            logAxiosError(e);
            if (e.response) {
                if (e.response.status >= 500) {
                    logWarn('抓取微博出错', e)
                } else {
                    logError('抓取微博出错', e)
                }
            } else {
                logErrorDetail('抓取微博出错', e)
            }
            return false
        }
        try {
            for (const nmb of new_mblogs) {
                if (nmb.user.id != this.user.id) {
                    logger.info(`<${this.user.screen_name}>${nmb.title}:${nmb.user.screen_name}\n${nmb.text_raw}`)
                    sendMsg(timePrefix() + `<${this.user.screen_name}>${nmb.title}:${nmb.user.screen_name}\n${nmb.text_raw}`, MsgType.weibo)
                }
                else if (nmb.visible_type == 0) {
                    if (nmb.repost_type == 1) {
                        logger.info(`<${this.user.screen_name}>微博转发\n${nmb.text_raw}\n原动态\n`)
                        sendMsg(timePrefix() + `<${this.user.screen_name}>微博转发\n${nmb.text_raw}`, MsgType.weibo)
                    } else {
                        logger.info(`<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                        sendMsg(timePrefix() + `<${this.user.screen_name}>微博动态\n${nmb.text_raw}`, MsgType.weibo)
                    }
                } else if (nmb.visible_type == 10) {
                    if (nmb.repost_type == 1) {
                        logger.info(`<${this.user.screen_name}>微博仅粉丝可见转发\n${nmb.text_raw}原动态\n`)
                        sendMsg(timePrefix() + `<${this.user.screen_name}>微博仅粉丝可见转发\n${nmb.text_raw}`, MsgType.weibo)
                    } else {
                        logger.info(`<${this.user.screen_name}>微博仅粉丝可见动态\n${nmb.text_raw}`)
                        sendMsg(timePrefix() + `<${this.user.screen_name}>微博仅粉丝可见动态\n${nmb.text_raw}`, MsgType.weibo)
                    }
                } else {
                    logger.info(`<${this.user.screen_name}>微博动态(visible_type=${nmb.visible_type})\n${nmb.text_raw}`)
                    sendMsg(timePrefix() + `<${this.user.screen_name}>微博动态(visible_type=${nmb.visible_type})\n${nmb.text_raw}`, MsgType.weibo)
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (e) {
            logErrorDetail('抓取微博出错', e)
        }
    }
    fetchUserInfo() {
        logger.debug("开始抓取用户信息");
        this.user.checkAndGetUserInfo().then(async (user_info) => {
            for (const ui of user_info) {
                logger.info(`<${this.user.screen_name}>${ui}`)
                sendMsg(timePrefix() + `<${this.user.screen_name}>${ui}`, MsgType.weibo)
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }).catch(e => {
            logErrorDetail('抓取用户信息出错', e)
            logAxiosError(e);
        })
    }
    public async run() {
        while (true) {
            for (var i = 0; i < 60; i++) {
                this.fetchMblog()
                this.fetchUserInfo()
                await new Promise(resolve => setTimeout(resolve, 10 * 1000));
            }
            Promise.race([
                this.weiboWeb.refresh(),
                new Promise(resolve => setTimeout(resolve, 120 * 1000, 'timeout'))
            ]).then(
                r => {
                    if (r == 'timeout') {
                        logger.error(`刷新cookie超时`);
                        process.exit(1)
                    }
                }
            )
        }
    }
}