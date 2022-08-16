import { UpdateTypeDocWithName } from ".."
import { BiliSimpleUser } from "./BiliSimpleUser"

export { BiliSimpleUser }

export enum BiliGuardOnline {
    OFFLINE = 0,
    ONLINE = 1,
    NONE = 2,
}

export type BiliGuardState = UpdateTypeDocWithName & BiliSimpleUser & {
    page: number
    isOnline: BiliGuardOnline
}

export type BiliGuardApi = {
    info: typeof BiliGuardApiInfoDemo,
    list: BiliGuardApiList[],
    top3: BiliGuardApiList[],
}

export type BiliGuardApiList = typeof BiliGuardApiListDemo

function BiliGuardConvert(data: BiliGuardApiList, user: BiliSimpleUser, page: number): BiliGuardState {
    return { ...user, page, shark7_id: String(data.ruid), shark7_name: data.username, isOnline: data.is_alive }
}

const BiliGuardApiListDemo = {
    "uid": 39373763,
    "ruid": 434334701,
    "rank": 200,
    "username": "AceDroidX",
    "face": "http://i2.hdslb.com/bfs/face/7da07903d87c27c42f4e502abfeb8912cb9b92d5.jpg",
    "is_alive": 0,
    "guard_level": 3,
    "guard_sub_level": 0,
    "medal_info": {
        "medal_name": "脆鲨",
        "medal_level": 26,
        "medal_color_start": 398668,
        "medal_color_end": 6850801,
        "medal_color_border": 6809855
    }
}

const BiliGuardApiInfoDemo = {
    "num": 943,
    "page": 32,
    "now": 1,
    "achievement_level": 2,
    "anchor_guard_achieve_level": 100
}
