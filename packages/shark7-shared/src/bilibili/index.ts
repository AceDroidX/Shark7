import { BiliUser } from "./BiliUser"
import { BiliVideo } from "./BiliVideo"

export { BiliUser, BiliVideo }

export type BiliApi<T = any> = {
    code: number
    message: string
    data: T
}
