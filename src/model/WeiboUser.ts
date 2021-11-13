import axios from "axios";
import { WeiboHeader, WeiboMsg } from "./model";
const profile_info_prefix = 'https://weibo.com/ajax/profile/info?uid='
const weibo_mblog_prefix = "https://weibo.com/ajax/statuses/mymblog?page=1&feature=0&uid="
export class WeiboUser {
    id: number;
    screen_name: string;
    profile_image_url: string;
    avatar_hd: string;

    verified_reason: string | undefined;
    description: string | undefined;

    mblogs: WeiboMsg[] = [];

    constructor(id: number, screen_name: string, profile_image_url: string, avatar_hd: string, verified_reason = undefined, description = undefined) {
        this.id = id;
        this.screen_name = screen_name;
        this.profile_image_url = profile_image_url;
        this.avatar_hd = avatar_hd;
        this.verified_reason = verified_reason;
        this.description = description;
    }

    static getFromRaw(raw: any): WeiboUser {
        console.log(raw)
        return new WeiboUser(
            raw.id,
            raw.screen_name,
            raw.profile_image_url,
            raw.avatar_hd,
            raw.verified_reason,
            raw.description
        );
    }

    static async getFromID(id: number): Promise<WeiboUser> {
        var result = await axios.get(profile_info_prefix + id, { headers: WeiboHeader })
        return WeiboUser.getFromRaw(
            result.data['data']['user']
        );
    }

    async getMblogs(): Promise<WeiboMsg[]> {
        if (this.id == undefined) {
            console.error(`getMblogs ID not set`);
            throw new Error("ID not set");
        }
        try {
            const raw = await axios.get(weibo_mblog_prefix + this.id, { headers: WeiboHeader });
            if (raw.status != 200) {
                console.error(`getMblogs status!=200:${raw.data}`);
                return [];
            }
            if (raw.data.ok != 1) {
                console.error(`getMblogs error:${raw.data}`);
                return [];
            }
            const mblogs = raw.data.data.list.map((mblog: any) => new WeiboMsg(mblog))
            return mblogs;
        } catch (error) {
            console.error("getMblogs catch (error):" + error);
            return [];
        }
    }

    async checkAndGetNewMblogs(): Promise<WeiboMsg[]> {
        var result = [];
        const new_mblogs = await this.getMblogs();
        if (new_mblogs.length == 0) {
            return [];
        }
        if (this.mblogs.length == 0) {
            console.info(`checkAndGetNewMblogs:${this.screen_name} this.mblogs is empty`);
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
}
