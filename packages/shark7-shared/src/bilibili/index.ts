import { BiliDynamic } from "./BiliDynamic"
import { BiliUser } from "./BiliUser"
import { BiliVideo } from "./BiliVideo"

export { BiliUser, BiliVideo, BiliDynamic }

export type BiliApi<T = any> = {
    code: number
    message: string
    data: T
}
