enum WeiboScope {
    User = 'Weibo.User',
    Mblog = 'Weibo.Mblog',
    Comment = 'Weibo.Comment',
    Like = 'Weibo.Like',
    Online = 'Weibo.Online'
}

enum BiliLiveScope {
    GuardOnline = 'BiliLive.GuardOnline',
    EntryEffect = 'BiliLive.EntryEffect',
    EntryWord = 'BiliLive.EntryWord',
    Danmaku = 'BiliLive.Danmaku',
    Gift = 'BiliLive.Gift',
    Live = 'BiliLive.Live'
}

enum BilibiliScope {
    User = 'Bilibili.User',
    Coin = 'Bilibili.Coin',
    Like = 'Bilibili.Like',
    Dynamic = 'Bilibili.Dynamic',
}

enum DouyinScope {
    User = 'Douyin.User',
}

enum NeteaseMusicScope {
    User = 'NeteaseMusic.User',
}

export const Scope = {
    Apex: 'Apex',
    Weibo: WeiboScope,
    BiliLive: BiliLiveScope,
    Bilibili: BilibiliScope,
    Douyin: DouyinScope,
    NeteaseMusic: NeteaseMusicScope,
};

export enum ScopeName {
    'Apex' = 'Apex信息',
    'Weibo.User' = '微博用户信息',
    'Weibo.Mblog' = '微博动态',
    'Weibo.Comment' = '微博评论',
    'Weibo.Like' = '微博点赞',
    'Weibo.Online' = '微博在线',
    'BiliLive.GuardOnline' = '大航海在线',
    'BiliLive.EntryEffect' = '直播间进入效果',
    'BiliLive.EntryWord' = '直播间进入提示',
    'BiliLive.Danmaku' = '发送弹幕',
    'BiliLive.Gift' = '赠送礼物',
    'BiliLive.Live' = '直播间状态',
    'Bilibili.User' = 'B站用户信息',
    'Bilibili.Coin' = 'B站投币视频',
    'Bilibili.Like' = 'B站点赞视频',
    'Bilibili.Dynamic' = 'B站动态',
    'Douyin.User' = '抖音用户信息',
    'NeteaseMusic.User' = '网易云音乐用户信息',
}

export function getScopeName(id: string): string | undefined {
    for (const [key, value] of Object.entries(ScopeName)) {
        if (key == id)
            return value;
    }
    return undefined;
}
