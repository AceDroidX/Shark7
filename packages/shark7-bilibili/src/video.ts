import axios from "axios";
import type { BiliApi, BiliVideo } from "shark7-shared";
import { logAxiosError, logErrorDetail, logger } from "shark7-shared";
import { MongoController } from "./MongoController.ts";

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'

export async function getVideo(user_id: number, user_name: string, type: 'coin' | 'like'): Promise<BiliVideo[] | null> {
    try {
        const cookie = process.env['cookie'] ?? 'buvid3=12345678-1234-1234-1234-123456789123infoc'
        const headers = { 'user-agent': UserAgent, 'referer': 'https://space.bilibili.com/', cookie }
        const resp = await axios.get<BiliApi>(`https://api.bilibili.com/x/space/${type}/video?vmid=${user_id}`, { headers })
        if (resp.status != 200) {
            logger.warn(`getVideo resp.status!=200\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        if (resp.data.code != 0) {
            logger.warn(`getVideo resp.data.code!=0\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        let data
        if (type == 'coin') { data = resp.data.data } else { data = resp.data.data.list }
        for (const [index, item] of data.entries()) {
            data[index].shark7_id = String(user_id)
            data[index].shark7_name = user_name
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
