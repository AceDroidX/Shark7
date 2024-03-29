import logger from "shark7-shared/dist/logger";
import { WeiboUser, WeiboMsg } from 'shark7-shared/dist/weibo'
import { WeiboHTTP } from "./WeiboHTTP";
import { MongoController } from "../MongoController";
const profile_info_prefix = 'https://weibo.com/ajax/profile/info?uid='
const weibo_mblog_prefix = "https://weibo.com/ajax/statuses/mymblog?page=1&feature=0&uid="

export class WeiboUserCtl {
    wbhttp: WeiboHTTP
    constructor(wbhttp: WeiboHTTP) {
        this.wbhttp = wbhttp
    }

    async getFromID(id: number): Promise<WeiboUser> {
        var result = await this.getRawUserInfo(id);
        if (!result) process.exit(1);
        return WeiboUser.getFromRaw(result)
    }

    async getRawUserInfo(id: number): Promise<any> {
        var result = await this.wbhttp.getURL(profile_info_prefix + id)
        if (!result) {
            return null
        }
        if (result.status != 200) {
            logger.error(`getRawUserInfo status!=200:\n${JSON.stringify(result.data)}`);
            return null;
        }
        if (result.data.ok != 1) {
            if (result.data.url == 'https://weibo.com/login.php') {
                logger.error(`cookie已失效:getRawUserInfo error:\n${JSON.stringify(result.data)}`);
                return null;
            } else {
                logger.error(`getRawUserInfo error:\n${JSON.stringify(result.data)}`);
                return null;
            }
        }
        return result.data['data']['user'];
    }

    async getMblogs(id: number): Promise<WeiboMsg[]> {
        const raw = await this.wbhttp.getURL(weibo_mblog_prefix + id)
        if (!raw) {
            return []
        }
        if (raw.status != 200) {
            logger.error(`getMblogs status!=200:\n${JSON.stringify(raw.data)}`);
            return [];
        }
        if (raw.data.ok != 1) {
            logger.error(`getMblogs error:\n${JSON.stringify(raw.data)}`);
            return [];
        }
        const mblogs = raw.data.data.list.map((mblog: any) => new WeiboMsg(mblog, id));
        return mblogs;
    }

    async checkAndGetNewMblogs(id: number, mongo: MongoController): Promise<WeiboMsg[]> {
        var result = [];
        const new_mblogs = await this.getMblogs(id);
        if (new_mblogs.length == 0) {
            return [];
        }
        for (const nmb of new_mblogs.reverse()) {
            const exist = await mongo.isMblogIDExist(nmb.id);
            if (exist) {
                continue;
            }
            result.push(nmb);
        }
        return result;
    }
    async updateUserInfo(user: WeiboUser): Promise<WeiboUser | null> {
        var raw = await this.getRawUserInfo(user.id);
        if (!raw) return null
        user.setInfoFromRaw(raw);
        return user;
    }
}
