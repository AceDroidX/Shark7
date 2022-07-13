import { logErrorDetail } from 'shark7-shared/dist/utils';
import logger from 'shark7-shared/dist/logger';
import { MongoController } from './MongoController';
import { getReqConfig, fetchURL, onlineStatusCovent } from './utils';
import { OnlineData, WeiboCard } from "./model";

export async function fetchOnline(mongo: MongoController, weibo_id: number) {
    logger.debug('开始抓取在线状态');
    if (!mongo.cookieCache) {
        logger.error('cookieCache为空');
        return;
    }
    if (!process.env['weibo_online_cid']) {
        logger.error('env:weibo_online_cid为空');
        return;
    }
    const reqConfig = getReqConfig(mongo, process.env['weibo_online_cid']);
    const data = await fetchURL('https://api.weibo.cn/2/page', reqConfig);
    let cards: WeiboCard[] = data.cards;
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
                        let online = onlineStatusCovent(inner_card.desc1)
                        if (online == undefined) {
                            logger.warn(`未知的在线状态${inner_card.desc1}`)
                            online = false
                        }
                        const data: OnlineData = {
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
            logErrorDetail('抓取在线状态出错', err);
            logger.error(`${JSON.stringify(card)}`);
        }
    });
}
