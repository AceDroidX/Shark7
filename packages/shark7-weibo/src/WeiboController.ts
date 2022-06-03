import { WeiboUser } from "./model/WeiboUser";
import { logAxiosError, logError, logErrorDetail, logWarn } from "shark7-shared/dist/utils";
import logger from "shark7-shared/dist/logger";
import { WeiboHTTP } from "./model/WeiboHTTP";
import { Web } from "./model/Web";
import { Puppeteer } from "./model/puppeteer";
import { ToadScheduler, SimpleIntervalJob, Task, AsyncTask } from 'toad-scheduler';
import { MongoController } from "./MongoController";

export class WeiboController {
    static wc: WeiboController;

    user: WeiboUser
    weiboWeb: Web
    mongo: MongoController

    constructor(user: WeiboUser, weiboWeb: Web, mongo: MongoController) {
        this.user = user;
        this.weiboWeb = weiboWeb;
        this.mongo = mongo;
    }
    static async init(uid: number, mongo: MongoController) {
        if (this.wc != undefined) {
            return this.wc;
        }
        const weiboWeb = (await Puppeteer.getInstance(mongo)).weiboweb
        WeiboHTTP.web = weiboWeb;
        await weiboWeb.refresh()
        this.wc = new WeiboController(await WeiboUser.getFromID(uid), weiboWeb, mongo)
        return this.wc;
    }
    async fetchMblog() {
        logger.debug("开始抓取微博");
        let new_mblogs
        try {
            new_mblogs = await this.user.checkAndGetNewMblogs(this.mongo)
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
            user = await this.user.updateUserInfo()
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
        const refreshCookieTask = new AsyncTask(
            'refreshCookie',
            async () => {
                const r = await Promise.race([
                    this.weiboWeb.refresh(),
                    new Promise(resolve => setTimeout(resolve, 120 * 1000, 'timeout'))
                ]);
                if (r == 'timeout') {
                    logger.error(`刷新cookie超时`);
                    process.exit(1);
                }
            },
            (err: Error) => { logError('refreshCookie错误', err) }
        )
        scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 3, }, fetchMblogTask))
        scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ seconds: 20, }, fetchUserInfoTask))
        scheduler.addSimpleIntervalJob(new SimpleIntervalJob({ minutes: 10, }, refreshCookieTask))
    }
}