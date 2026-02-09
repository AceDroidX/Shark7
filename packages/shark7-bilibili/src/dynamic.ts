import axios from "axios";
import type { BiliApi, BiliDynamic } from "shark7-shared";
import { logAxiosError, logErrorDetail, logger } from "shark7-shared";
import { MongoController } from "./MongoController.ts";

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'

export async function getDynamic(user_id: number, user_name?: string): Promise<BiliDynamic[] | null> {
    try {
        const cookie = process.env['cookie'] ?? 'buvid3=12345678-1234-1234-1234-123456789123infoc;DedeUserID=123456789'
        const headers = { 'user-agent': UserAgent, 'referer': 'https://space.bilibili.com/', cookie }
        const resp = await axios.get<BiliApi>(`https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${user_id}&features=itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote,forwardListHidden,decorationCard,commentsNewVersion,onlyfansAssetsV2,ugcDelete,onlyfansQaCard,avatarAutoTheme,sunflowerStyle,cardsEnhance,eva3CardOpus,eva3CardVideo,eva3CardComment,eva3CardUser`, { headers })
        if (resp.status != 200) {
            logger.warn(`getDynamic resp.status!=200\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        if (resp.data.code != 0) {
            logger.warn(`getDynamic resp.data.code!=0\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        let data = resp.data.data.items
        for (const [index, item] of data.entries()) {
            data[index].shark7_id = String(user_id)
            if (user_name) {
                data[index].shark7_name = user_name
            } else if (item.modules.module_author.name) {
                data[index].shark7_name = item.modules.module_author.name
            }
        }
        return data
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err)
        } else {
            logErrorDetail('抓取数据失败', err)
        }
        return null
    }
}

export async function insertDynamic(ctr: MongoController, user_id: number): Promise<boolean> {
    const data = await getDynamic(user_id)
    if (!data) return false
    for (const item of data) {
        await ctr.insertDynamic(item)
    }
    return true
}
