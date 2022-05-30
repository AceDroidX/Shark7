import axios from "axios";
import logger from "../logger";
const UID_info_prefix = 'https://api.bilibili.com/x/space/acc/info?mid='
const ROOMID_info_prefix = "https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id="

export class BiliUser {
    uid: number;
    name: string;
    roomid: number;

    constructor() {
        this.uid = 0;
        this.name = '未知用户';
        this.roomid = 0;
    }

    async initByUID(uid: number) {
        this.uid = uid;
        await axios.get(UID_info_prefix + uid).then(res => {
            this.name = res.data['data']['name']
            this.roomid = res.data['data']['live_room']['roomid']
        })
        return this
    }
    async initByRoomid(roomid: number) {
        await axios.get(ROOMID_info_prefix + roomid).then(res => {
            this.uid = res.data['data']['room_info']['uid']
            this.name = res.data['data']['anchor_info']['base_info']['uname']
            this.roomid = res.data['data']['room_info']['room_id']
        })
        if (roomid != this.roomid) {
            logger.info(`${this.name}:${this.uid}/${roomid}的实际房间号为${this.roomid}`)
        }
        return this
    }
    init(uid: number, name: string, roomid: number): BiliUser {
        this.uid = uid;
        this.name = name;
        this.roomid = roomid;
        return this
    }
    toString(): string {
        return `${this.name}:${this.uid}/${this.roomid}`
    }
}
