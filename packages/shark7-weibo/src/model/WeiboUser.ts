import { WeiboMsg } from "./model";
import logger from "shark7-shared/dist/logger";
import url from 'url'
import { WeiboHTTP } from "./WeiboHTTP";
import { MongoController } from "../MongoController";
const profile_info_prefix = 'https://weibo.com/ajax/profile/info?uid='
const weibo_mblog_prefix = "https://weibo.com/ajax/statuses/mymblog?page=1&feature=0&uid="
export class WeiboUser {
    id: number;
    screen_name: string;
    profile_image_url: string;
    avatar_hd: string;
    friends_count: number;

    verified_reason: string | undefined;
    description: string | undefined;

    constructor(id: number, screen_name: string, profile_image_url: string, avatar_hd: string, friends_count: number, verified_reason: string | undefined, description: string | undefined) {
        this.id = id;
        this.screen_name = screen_name;
        this.profile_image_url = profile_image_url != '' ? url.format(new url.URL(profile_image_url), { search: false }) : '';
        this.avatar_hd = avatar_hd != '' ? url.format(new url.URL(avatar_hd), { search: false }) : '';
        this.friends_count = friends_count
        this.verified_reason = verified_reason;
        this.description = description;
    }

    setInfoFromRaw(raw: any) {
        this.screen_name = raw.screen_name;
        this.profile_image_url = raw.profile_image_url != '' ? url.format(new url.URL(raw.profile_image_url), { search: false }) : '';
        this.avatar_hd = raw.avatar_hd != '' ? url.format(new url.URL(raw.avatar_hd), { search: false }) : '';
        this.friends_count = raw.friends_count;
        this.verified_reason = raw.verified_reason;
        this.description = raw.description;
    }

    static getFromRaw(raw: any): WeiboUser {
        // logger.debug('getFromRaw\n'+JSON.stringify(raw));
        return new WeiboUser(
            raw.id,
            raw.screen_name,
            raw.profile_image_url,
            raw.avatar_hd,
            raw.friends_count,
            raw.verified_reason,
            raw.description
        );
    }
}

export class WeiboUserCtl {
    wbhttp: WeiboHTTP
    constructor(wbhttp: WeiboHTTP) {
        this.wbhttp = wbhttp
    }

    async getFromID(id: number): Promise<WeiboUser> {
        var result = await this.getRawUserInfo(id);
        return WeiboUser.getFromRaw(result);
    }

    async getRawUserInfo(id: number): Promise<any> {
        var result = await this.wbhttp.getURL(profile_info_prefix + id)
        if (!result) {
            return {}
        }
        if (result.status != 200) {
            logger.error(`getRawUserInfo status!=200:\n${JSON.stringify(result.data)}`);
            return {};
        }
        if (result.data.ok != 1) {
            if (result.data.url == 'https://weibo.com/login.php') {
                logger.error(`cookie已失效:getRawUserInfo error:\n${JSON.stringify(result.data)}`);
                return {};
            } else {
                logger.error(`getRawUserInfo error:\n${JSON.stringify(result.data)}`);
                return {};
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
            logger.error(`getMblogs status!=200:`);
            logger.error(JSON.stringify(raw.data));
            return [];
        }
        if (raw.data.ok != 1) {
            logger.error(`getMblogs error:`);
            logger.error(JSON.stringify(raw.data));
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
    async updateUserInfo(user: WeiboUser) {
        var raw = await this.getRawUserInfo(user.id);
        user.setInfoFromRaw(raw);
        return user;
    }
}
