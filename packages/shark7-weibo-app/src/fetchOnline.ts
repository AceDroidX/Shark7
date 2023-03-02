import { Protocol } from 'puppeteer';
import { logErrorDetail, logger, OnlineData } from 'shark7-shared';
import { WeiboCard, WeiboOnlineIdConfig } from "./model";
import { MongoController } from './MongoController';
import { fetchURL, getReqConfig } from './utils';

export async function getOnline(cookie: Protocol.Network.Cookie[], config: WeiboOnlineIdConfig): Promise<WeiboCard[] | null> {
    const cid = config.online_cid
    const reqConfig = getReqConfig(cookie, cid);
    const data = await fetchURL('https://api.weibo.cn/2/page', reqConfig);
    if (!data) return null
    return data.cards
}

export async function fetchOnline(mongo: MongoController, cookie: Protocol.Network.Cookie[], config: WeiboOnlineIdConfig): Promise<boolean> {
    logger.debug('开始抓取在线状态');
    const weibo_id = config.id
    const cards = await getOnline(cookie, config)
    if (!cards) return false
    cards.forEach(async (card: WeiboCard) => {
        try {
            if (card.card_type == 11) {
                if (!card.card_group) {
                    return;
                }
                for (const inner_card of card.card_group) {
                    if (inner_card.card_type == 30) {
                        if (!inner_card.desc1) {
                            logger.warn(`inner_card.desc1不存在:${JSON.stringify(card)}`);
                            return;
                        }
                        if (!inner_card.user) {
                            logger.warn(`inner_card.user不存在:${JSON.stringify(card)}`);
                            return;
                        }
                        let online = inner_card.desc1 == '微博在线了'
                        const data: OnlineData = {
                            shark7_id: String(weibo_id),
                            id: weibo_id,
                            screen_name: inner_card.user.screen_name,
                            desc1: inner_card.desc1,
                            online: online
                        }
                        await mongo.insertOnline(data)
                    }
                }
            } else if (card.card_type == 9) {
            } else {
                logger.warn(`card_type未知:${JSON.stringify(card)}`);
            }
        } catch (err) {
            logErrorDetail('抓取在线状态出错', err, card);
        }
    });
    return true
}
