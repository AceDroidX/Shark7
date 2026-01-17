import axios from "axios";
import type { BiliApi, BiliUser } from "shark7-shared";
import { BiliGet, logAxiosError, logErrorDetail, logger } from "shark7-shared";
import { MongoController } from "./MongoController.ts";

export async function getUser(user_id: number): Promise<BiliUser | null> {
    try {
        const resp = await BiliGet<BiliApi<BiliUser>>(`https://api.bilibili.com/x/space/wbi/acc/info`, { platform: 'web', mid: user_id })
        if (resp.status != 200) {
            logger.warn(`getUser resp.status!=200\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        if (resp.data.code != 0) {
            logger.warn(`getUser resp.data.code!=0\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        let data = resp.data.data
        data.face = 'https://i0.' + data.face.match('hdslb.com.*$')?.[0]
        data.nameplate.image = 'https://i0.' + data.nameplate.image.match('hdslb.com.*$')?.[0]
        data.nameplate.image_small = 'https://i0.' + data.nameplate.image_small.match('hdslb.com.*$')?.[0]
        data.top_photo = 'https://i0.' + data.top_photo.match('hdslb.com.*$')?.[0]
        data.top_photo_v2.l_img = 'https://i0.' + data.top_photo_v2.l_img.match('hdslb.com.*$')?.[0]
        data.top_photo_v2.l_200h_img = 'https://i0.' + data.top_photo_v2.l_200h_img.match('hdslb.com.*$')?.[0]
        let dataAny: any = data
        dataAny.shark7_id = String(user_id)
        return dataAny
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err)
        } else {
            logErrorDetail('抓取数据失败', err)
        }
        return null
    }
}
