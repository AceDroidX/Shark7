import axios from "axios";
import { BiliApi, BiliGet, BiliUser } from "../bilibili";
import { logger } from "../logger";
import { logErrorDetail } from "../utils";
import { BiliRoomInfo } from "./BiliRoomInfo";
const UID_info_prefix = 'https://api.bilibili.com/x/space/wbi/acc/info'
const ROOMID_info_prefix = "https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id="
export class BiliSimpleUser {
    uid: number;
    name: string;
    roomid: number;

    constructor(uid: number, name: string, roomid: number) {
        this.uid = uid
        this.name = name
        this.roomid = roomid
    }

    static async initByUID(uid: number): Promise<BiliSimpleUser | null> {
        try {
            const resp = await BiliGet<BiliApi<BiliUser>>(UID_info_prefix, { mid: uid })
            if (resp.status != 200) {
                logger.error('resp.status != 200:' + JSON.stringify(resp))
                return null
            }
            if (resp.data.code != 0) {
                logger.error('resp.data.code != 0:' + JSON.stringify(resp))
                return null
            }
            return new BiliSimpleUser(resp.data.data.mid, resp.data.data.name, resp.data.data.live_room.roomid)
        } catch (err) {
            logErrorDetail('抓取数据失败', err)
            return null
        }
    }
    static async initByRoomid(roomid: number): Promise<BiliSimpleUser | null> {
        try {
            const resp = await axios.get<BiliApi<BiliRoomInfo>>(ROOMID_info_prefix + roomid)
            if (resp.status != 200) {
                logger.error('resp.status != 200:' + JSON.stringify(resp))
                return null
            }
            if (resp.data.code != 0) {
                logger.error('resp.data.code != 0:' + JSON.stringify(resp))
                return null
            }
            const uid = resp.data.data.room_info.uid
            const name = resp.data.data.anchor_info.base_info.uname
            const real_roomid = resp.data.data.room_info.room_id
            const short_id = resp.data.data.room_info.short_id
            if (short_id != 0) {
                logger.info(`${name}:${uid}/${short_id}的实际房间号为${real_roomid}`)
            }
            return new BiliSimpleUser(uid, name, real_roomid)
        } catch (err) {
            logErrorDetail('抓取数据失败', err)
            return null
        }
    }
    toString(): string {
        return `${this.name}:${this.uid}/${this.roomid}`
    }
}
