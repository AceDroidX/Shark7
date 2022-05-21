export {
    FiltedMsg,
    MsgType
}

enum LiveMsgType {
    GuardOnline = 'GuardOnline',
    GuardEntry = 'GuardEntry',
    Entry = 'Entry',
    Danmaku = 'Danmaku',
    Gift = 'Gift',
    Live = 'Live',
}

const MsgType = {
    msg: 'msg',
    log: 'log',
    weibo: 'weibo',
    live: LiveMsgType,
    apex: 'apex',
}

class FiltedMsg {
    code: number;
    msg: string;
    type: string;
    raw: object;
    constructor(code: number, msg: string, type: string, raw: object) {
        this.code = code;
        this.msg = msg;
        this.type = type;
        this.raw = raw;
    }
}