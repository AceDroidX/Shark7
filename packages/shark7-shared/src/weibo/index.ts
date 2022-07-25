import url from 'url'
import { UpdateTypeDoc } from '..';

export class WeiboUser implements UpdateTypeDoc {
    shark7_id: string

    id: number;
    screen_name: string;
    profile_image_url: string;
    avatar_hd: string;
    friends_count: number;

    verified_reason: string | undefined;
    description: string | undefined;

    constructor(shark7_id: string, id: number, screen_name: string, profile_image_url: string, avatar_hd: string, friends_count: number, verified_reason: string | undefined, description: string | undefined) {
        this.shark7_id = shark7_id
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
            String(raw.id),
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

export class WeiboMsg {
    id: number;
    mblogid: string;
    text: string;
    text_raw: string;
    created_at: string;
    visible_type: number;
    pic_num: number;
    pic_ids: string[];
    pic_infos: any[];
    isTop: boolean;
    title: string;
    repost_type: number;

    user: WeiboUser;

    _timestamp: number;
    _userid: number;
    _raw: any

    constructor(data: any, userid: number) {
        this.id = data.id;
        this.mblogid = data.mblogid;
        this.text = data.text;
        this.text_raw = data.text_raw;
        this.created_at = data.created_at;
        this.visible_type = data.visible.type;
        this.pic_num = data.pic_num;
        this.pic_ids = data.pic_ids;
        this.pic_infos = data.pic_infos;
        this.isTop = data.isTop;
        if (data.title == undefined) {
            this.title = "";
        } else {
            this.title = data.title.text;
        }
        this.repost_type = data.repost_type;
        this.user = WeiboUser.getFromRaw(data.user);
        this._userid = userid;
        this._raw = data
        this._timestamp = new Date(data.created_at).getTime()
    }
}

export type OnlineData = UpdateTypeDoc & {
    id: number
    screen_name: string
    desc1: string
    online: boolean
}
