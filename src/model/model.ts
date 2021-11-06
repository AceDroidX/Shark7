export {
    FiltedMsg,
    GuardState
}

class FiltedMsg {
    code: number;
    msg: string;
    raw: object;
    constructor(code: number, msg: string, raw: object) {
        this.code = code;
        this.msg = msg;
        this.raw = raw;
    }
}

class GuardState {
    uid: number;
    roomid: number;
    // 2: 未找到(不是舰长)
    // 1: 在线
    // 0: 不在线
    isOnline: number;
    constructor(uid: number, roomid: number, state: number) {
        this.uid = uid;
        this.roomid = roomid;
        this.isOnline = state;
    }
}