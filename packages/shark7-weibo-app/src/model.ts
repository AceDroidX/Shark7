import { WeiboMsg } from 'shark7-weibo/dist/model/model';
import { WeiboUser } from 'shark7-weibo/dist/model/WeiboUser';


export type WeiboCard = {
    card_type: number;
    card_group?: WeiboCard[];
    mblog?: WeiboMsg;
    user?: WeiboUser;
    desc1?: string;
};


export type OnlineData = {
    id: number
    screen_name: string
    desc1: string
}
