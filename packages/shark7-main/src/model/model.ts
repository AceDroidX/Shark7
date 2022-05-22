export {
    FiltedMsg,
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