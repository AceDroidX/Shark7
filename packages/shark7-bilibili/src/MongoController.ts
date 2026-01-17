import type { BiliDynamic, BiliUser, BiliVideo } from 'shark7-shared';
import { BilibiliDBs, MongoControllerBase } from 'shark7-shared';

export class MongoController extends MongoControllerBase<BilibiliDBs> {
    async insertUser(user: BiliUser) {
        return await this.dbs.userDB.updateOne({ shark7_id: user.shark7_id }, [{ $replaceWith: user }], { upsert: true })
    }
    async getUser(id: number) {
        return await this.dbs.userDB.findOne({ shark7_id: String(id) })
    }
    async insertCoin(video: BiliVideo) {
        return await this.dbs.coinDB.updateOne({ shark7_id: video.shark7_id, aid: video.aid }, [{ $replaceWith: video }], { upsert: true })
    }
    async insertLike(video: BiliVideo) {
        return await this.dbs.likeDB.updateOne({ shark7_id: video.shark7_id, aid: video.aid }, [{ $replaceWith: video }], { upsert: true })
    }
    async insertDynamic(data: BiliDynamic) {
        return await this.dbs.dynamicDB.updateOne({ id_str: data.id_str }, [{ $replaceWith: data }], { upsert: true })
    }
    async getCoinByAid(shark7_id: string, aid: number): Promise<BiliVideo | null> {
        return await this.dbs.coinDB.findOne({ shark7_id, aid });
    }
    async getLikeByAid(shark7_id: string, aid: number): Promise<BiliVideo | null> {
        return await this.dbs.likeDB.findOne({ shark7_id, aid });
    }
    async getDynamicById(id_str: string): Promise<BiliDynamic | null> {
        return await this.dbs.dynamicDB.findOne({ id_str });
    }
}
