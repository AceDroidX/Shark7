import { WeiboUser, WeiboUserCtl } from "./model/WeiboUser";
import { logAxiosError, logError, logErrorDetail, logWarn } from "shark7-shared/dist/utils";
import logger from "shark7-shared/dist/logger";
import { ToadScheduler, SimpleIntervalJob, Task } from 'toad-scheduler';
import { MongoController } from "./MongoController";
import { WeiboHTTP } from "./model/WeiboHTTP";

export class WeiboController {
    static wc: WeiboController;

    userCtl: WeiboUserCtl
    user: WeiboUser
    mongo: MongoController

    constructor(userCtl: WeiboUserCtl, user: WeiboUser, mongo: MongoController) {
        this.userCtl = userCtl
        this.user = user;
        this.mongo = mongo;
    }
    static async init(uid: number, mongo: MongoController) {
        if (this.wc != undefined) {
            return this.wc;
        }
        const wbUserCtl = new WeiboUserCtl(new WeiboHTTP(mongo))
        this.wc = new WeiboController(wbUserCtl, await wbUserCtl.getFromID(uid), mongo)
        return this.wc;
    }
    async fetchMblog() {
        logger.debug("开始抓取微博");
        let new_mblogs
        try {
            new_mblogs = await this.userCtl.checkAndGetNewMblogs(this.user.id, this.mongo)
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
                await this.mongo.insertMblog(nmb)
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (e) {
            logErrorDetail('抓取微博出错', e)
        }
    }
    async fetchUserInfo() {
        logger.debug("开始抓取用户信息");
        let user
        try {
            user = await this.userCtl.updateUserInfo(this.user)
        } catch (e: any) {
            logAxiosError(e);
            if (e.response) {
                if (e.response.status >= 500) {
                    logWarn('抓取用户信息出错', e)
                } else {
                    logError('抓取用户信息出错', e)
                }
            } else {
                logErrorDetail('抓取用户信息出错', e)
            }
            return false
        }
        try {
            await this.mongo.insertUserInfo(user)
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e: any) {
            logErrorDetail('抓取用户信息出错', e)
        }
    }
    public async run() {
        await this.fetchUserInfo()
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
        scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 3, }, fetchMblogTask))
        scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 10, }, fetchUserInfoTask))
    }
}
