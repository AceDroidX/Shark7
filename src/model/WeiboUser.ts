import axios from "axios";
import { WeiboHeader, WeiboMsg } from "./model";
import logger from "../logger";
import url from 'url'
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

    mblogs: WeiboMsg[] = [];

    constructor(id: number, screen_name: string, profile_image_url: string, avatar_hd: string, friends_count: number, verified_reason: string | undefined, description: string | undefined) {
        this.id = id;
        this.screen_name = screen_name;
        this.profile_image_url = url.format(new url.URL(profile_image_url), { search: false });
        this.avatar_hd = url.format(new url.URL(avatar_hd), { search: false });
        this.friends_count = friends_count
        this.verified_reason = verified_reason;
        this.description = description;
    }

    setInfoFromRaw(raw: any) {
        this.screen_name = raw.screen_name;
        this.profile_image_url = url.format(new url.URL(raw.profile_image_url), { search: false });
        this.avatar_hd = url.format(new url.URL(raw.avatar_hd), { search: false });
        this.friends_count = raw.friends_count;
        this.verified_reason = raw.verified_reason;
        this.description = raw.description;
    }

    static getFromRaw(raw: any): WeiboUser {
        logger.debug(raw)
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

    static async getFromID(id: number): Promise<WeiboUser> {
        var result = await this.getRawUserInfo(id);
        return WeiboUser.getFromRaw(result);
    }

    static async getRawUserInfo(id: number): Promise<any> {
        var result = await axios.get(profile_info_prefix + id, { headers: WeiboHeader })
        if (result.status != 200) {
            logger.error(`getRawUserInfo status!=200:`);
            logger.error(JSON.stringify(result.data));
            return {};
        }
        if (result.data.ok != 1) {
            logger.error(`getRawUserInfo error:`);
            logger.error(JSON.stringify(result.data));
            return {};
        }
        return result.data['data']['user'];
    }

    async getMblogs(): Promise<WeiboMsg[]> {
        if (this.id == undefined) {
            logger.error(`getMblogs ID not set`);
            throw new Error("ID not set");
        }
        const raw = await axios.get(weibo_mblog_prefix + this.id, { headers: WeiboHeader });
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
        const mblogs = raw.data.data.list.map((mblog: any) => new WeiboMsg(mblog))
        return mblogs;
    }

    async checkAndGetNewMblogs(): Promise<WeiboMsg[]> {
        var result = [];
        const new_mblogs = await this.getMblogs();
        if (new_mblogs.length == 0) {
            return [];
        }
        if (this.mblogs.length == 0) {
            logger.info(`${this.screen_name}首次获取微博 this.mblogs为空`);
            this.mblogs = new_mblogs;
            return []
        }
        for (const nmb of new_mblogs.reverse()) {
            if (this.mblogs.findIndex(mb => mb.id == nmb.id) == -1) {
                result.unshift(nmb);
                //保存当前微博到列表第一个
                this.mblogs.unshift(nmb);
            }
        }
        return result;
    }
    async checkAndGetUserInfo() {
        var raw = await WeiboUser.getRawUserInfo(this.id);
        var result = [];
        if (raw.screen_name != this.screen_name) {
            result.push(`微博昵称更改\n原：${this.screen_name}现：${raw.screen_name}`);
        }
        if (this.avatar_hd != url.format(new url.URL(raw.avatar_hd), { search: false })) {
            result.push(`微博头像更改\n原：${this.avatar_hd}\n现：\n${url.format(new url.URL(raw.avatar_hd), { search: false })}`);
        }
        if (this.friends_count != raw.friends_count) {
            result.push(`微博关注数更改\n原：${this.friends_count}现：${raw.friends_count}`);
        }
        if (this.description != raw.description) {
            result.push(`微博简介更改\n原：${this.description}现：${raw.description}`);
        }
        if (this.verified_reason != raw.verified_reason) {
            result.push(`微博认证更改\n原：${this.verified_reason}现：${raw.verified_reason}`);
        }
        this.setInfoFromRaw(raw);
        return result;
    }
}