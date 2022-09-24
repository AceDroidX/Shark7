import logger from "shark7-shared/dist/logger";
import { Scheduler } from 'shark7-shared/dist/scheduler';
import { logErrorDetail, logWarn } from "shark7-shared/dist/utils";
import { WeiboMsg, WeiboUser } from 'shark7-shared/dist/weibo';
import { WeiboHTTP } from "./model/WeiboHTTP";
import { WeiboUserCtl } from "./model/WeiboUserCtl";
import { MongoController } from "./MongoController";

export class WeiboController {
    static wc: WeiboController;

    userCtl: WeiboUserCtl
    user: WeiboUser[]
    mongo: MongoController

    constructor(userCtl: WeiboUserCtl, user: WeiboUser[], mongo: MongoController) {
        this.userCtl = userCtl
        this.user = user;
        this.mongo = mongo;
    }
    static async init(uid: number[], mongo: MongoController) {
        if (this.wc != undefined) {
            return this.wc;
        }
        const wbUserCtl = new WeiboUserCtl(new WeiboHTTP(mongo))
        const weiboUser = await Promise.all(uid.map(id => wbUserCtl.getFromID(id)))
        this.wc = new WeiboController(wbUserCtl, weiboUser, mongo)
        return this.wc;
    }
    async fetchMblog(): Promise<boolean> {
        logger.debug("开始抓取微博");
        let new_mblogs: WeiboMsg[] = []
        try {
            for (const user of this.user) {
                new_mblogs = new_mblogs.concat(await this.userCtl.getMblogs(user.id))
            }
        } catch (e: any) {
            logWarn('抓取微博出错', e)
            if (e.response) {
                logger.warn(JSON.stringify(e.response))
            }
            return false
        }
        try {
            for (const nmb of new_mblogs) {
                await this.mongo.insertMblog(nmb)
            }
        } catch (e) {
            logErrorDetail('抓取微博出错', e)
            return false
        }
        return true
    }
    async fetchUserInfo(): Promise<boolean> {
        logger.debug("开始抓取用户信息");
        try {
            for (const user of this.user) {
                const updated = await this.userCtl.updateUserInfo(user)
                if (updated) this.mongo.insertUserInfo(updated)
            }
            return true;
        } catch (e: any) {
            logErrorDetail('抓取用户信息出错', e)
            return false
        }
    }
    public async run() {
        if (await this.userCtl.getRawUserInfo(this.user[0].id) == null) {
            logger.error('数据获取测试失败')
            process.exit(1)
        }
        await this.fetchUserInfo() // 先获取用户信息，是fetchMblog的前置
        let mblogInterval = process.env['mblog_interval'] ? Number(process.env['mblog_interval']) : 4
        let userInterval = process.env['user_interval'] ? Number(process.env['user_interval']) : 10
        const scheduler = new Scheduler()
        scheduler.addJob('fetchMblog', mblogInterval, () => { this.fetchMblog() })
        scheduler.addJob('fetchUserInfo', userInterval, () => { this.fetchUserInfo() })
    }
}
