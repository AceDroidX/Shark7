enum WeiboScope {
    User = 'Weibo.User',
    Mblog = 'Weibo.Mblog'
}

enum BiliLiveScope {
    GuardOnline = 'BiliLive.GuardOnline',
    EntryEffect = 'BiliLive.EntryEffect',
    EntryWord = 'BiliLive.EntryWord',
    Danmaku = 'BiliLive.Danmaku',
    Gift = 'BiliLive.Gift',
    Live = 'BiliLive.Live'
}

export const Scope = {
    Apex: 'Apex',
    Weibo: WeiboScope,
    BiliLive: BiliLiveScope,
};

export enum ScopeName {
    'Apex' = 'Apex信息',
    'Weibo.User' = '微博用户信息',
    'Weibo.Mblog' = '微博动态',
    'BiliLive.GuardOnline' = '大航海在线',
    'BiliLive.EntryEffect' = '直播间进入效果',
    'BiliLive.EntryWord' = '直播间进入提示',
    'BiliLive.Danmaku' = '发送弹幕',
    'BiliLive.Gift' = '赠送礼物',
    'BiliLive.Live' = '直播间状态'
}

export function getScopeName(id: string): string | undefined {
    for (const [key, value] of Object.entries(ScopeName)) {
        if (key == id)
            return value;
    }
    return undefined;
}
