import axios from "axios";
import { ChangeStreamInsertDocument, ChangeStreamUpdateDocument } from "mongodb";
import { Shark7Event } from "shark7-shared";
import { BiliApi, BiliVideo } from "shark7-shared";
import { logger } from "shark7-shared";
import { Scope } from 'shark7-shared';
import { logAxiosError, logErrorDetail } from "shark7-shared";
import { MongoController } from "./MongoController";

const UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.4'

export async function getVideo(user_id: number, user_name: string, type: 'coin' | 'like'): Promise<BiliVideo[] | null> {
    try {
        const resp = await axios.get<BiliApi>(`https://api.bilibili.com/x/space/${type}/video?vmid=${user_id}`, { headers: { 'user-agent': UserAgent } })
        if (resp.status != 200) {
            logger.warn(`resp.status!=200\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
            return null
        }
        if (resp.data.code != 0) {
            logger.warn(`resp.data.code!=0\nstatus:${resp.status}\n` + JSON.stringify(resp.data))
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

export async function insertVideo(ctr: MongoController, user_id: number, type: 'coin' | 'like'): Promise<boolean> {
    const user = await ctr.getUser(user_id)
    if (!user) {
        logger.error('getUser出错 请先添加User')
        process.exit(1)
    }
    const data = await getVideo(user_id, user.name, type)
    if (!data) return false
    if (type == 'coin') {
        for (const item of data) {
            await ctr.insertCoin(item)
        }
    } else {
        for (const item of data) {
            await ctr.insertLike(item)
        }
    }
    return true
}

export async function onCoinEvent(ctr: MongoController, event: ChangeStreamInsertDocument<BiliVideo>): Promise<Shark7Event | null> {
    const data = event.fullDocument
    if (!data) {
        logger.error(`fullDocument为${data}`)
        process.exit(1)
    }
    const msg = `<${data.owner.name}>${data.title}\nhttps://b23.tv/${data.bvid}`
    return { ts: Number(new Date()), name: String(data.shark7_name), scope: Scope.Bilibili.Coin, msg }
}

export async function onLikeEvent(ctr: MongoController, event: ChangeStreamInsertDocument<BiliVideo>): Promise<Shark7Event | null> {
    const data = event.fullDocument
    if (!data) {
        logger.error(`fullDocument为${data}`)
        process.exit(1)
    }
    const msg = `<${data.owner.name}>${data.title}\nhttps://b23.tv/${data.bvid}`
    return { ts: Number(new Date()), name: String(data.shark7_name), scope: Scope.Bilibili.Like, msg }
}

export async function onVideoUpdate(ctr: MongoController, event: ChangeStreamUpdateDocument): Promise<Shark7Event | null> {
    logger.debug('忽略onVideoUpdate')
    return null
}
