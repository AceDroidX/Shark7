import logger from "shark7-shared/dist/logger";
import { logError, logErrorDetail, logWarn } from "shark7-shared/dist/utils";
import { WeiboMsg, WeiboUser } from 'shark7-shared/dist/weibo';
import { SimpleIntervalJob, Task, ToadScheduler } from 'toad-scheduler';
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
                new_mblogs = new_mblogs.concat(await this.userCtl.checkAndGetNewMblogs(user.id, this.mongo))
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
        let new_user: WeiboUser[] = []
        try {
            for (const user of this.user) {
                new_user = new_user.concat(await this.userCtl.updateUserInfo(user))
            }
        } catch (e: any) {
            logWarn('抓取微博出错', e)
            if (e.response) {
                logger.warn(JSON.stringify(e.response))
            }
            return false
        }
        try {
            await Promise.all(new_user.map(user => this.mongo.insertUserInfo(user)))
        } catch (e: any) {
            logErrorDetail('抓取用户信息出错', e)
            return false
        }
        return true
    }
    public async run() {
        if (await this.userCtl.getRawUserInfo(this.user[0].id) == {}) {
            logger.error('数据获取测试失败')
            process.exit(1)
        }
        const scheduler = new ToadScheduler()
        const fetchMblogTask = new Task(
            'fetchMblog',
            () => { this.fetchMblog() },
            (err: Error) => { logError('fetchMblog错误', err) }
        )
        const fetchUserInfoTask = new Task(
            'fetchUserInfo',
            () => { this.fetchUserInfo() },
            (err: Error) => { logError('fetchUserInfo错误', err) }
        )
        let mblogInterval = 4
        if (process.env['mblog_interval']) {
            mblogInterval = Number(process.env['mblog_interval'])
        }
        let userInterval = 10
        if (process.env['user_interval']) {
            userInterval = Number(process.env['user_interval'])
        }
        scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: mblogInterval, }, fetchMblogTask))
        scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: userInterval, }, fetchUserInfoTask))
    }
}
