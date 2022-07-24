export {
    WeiboError
}

class WeiboError extends Error {
    code: number;
    name = "WeiboError";
    constructor(msg: string, code = 0) {
        super(msg);
        this.code = code;
    }
}
