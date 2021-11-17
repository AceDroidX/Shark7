import config from '../config'
import { WeiboUser } from './WeiboUser';

export {
    FiltedMsg,
    GuardState,
    WeiboMsg,
    WeiboHeader
}

class FiltedMsg {
    code: number;
    msg: string;
    raw: object;
    constructor(code: number, msg: string, raw: object) {
        this.code = code;
        this.msg = msg;
        this.raw = raw;
    }
}

class GuardState {
    uid: number;
    roomid: number;
    // 2: 未找到(不是舰长)
    // 1: 在线
    // 0: 不在线
    isOnline: number;
    constructor(uid: number, roomid: number, state: number) {
        this.uid = uid;
        this.roomid = roomid;
        this.isOnline = state;
    }
}

class WeiboMsg {
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

    user: WeiboUser;

    timestamp: number;
    raw: any

    constructor(data: any) {
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
        this.user = WeiboUser.getFromRaw(data.user);
        this.raw = data
        this.timestamp = new Date(data.created_at).getTime()
    }
}

const WeiboCookie = config.get('weibo_cookie')
if (typeof WeiboCookie != 'string') {
    throw new Error('weibo cookie not found')
}
const WeiboHeader = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36', 'cookie': WeiboCookie }
