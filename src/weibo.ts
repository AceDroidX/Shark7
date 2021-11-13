import axios from "axios";
import { WeiboUser } from "./model/WeiboUser";
import { sendMsgToKHL, timePrefix } from "./utils";

export class WeiboController {
    user: WeiboUser

    constructor(user: WeiboUser) {
        this.user = user;
    }
    static async getFromID(uid: number) {
        return new WeiboController(await WeiboUser.getFromID(uid));
    }
    public async run() {
        while (true) {
            console.debug(timePrefix() + "开始抓取微博");
            var new_mblogs = await this.user.checkAndGetNewMblogs();
            for (const nmb of new_mblogs) {
                console.info(timePrefix() + `<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                sendMsgToKHL(timePrefix() + `<${this.user.screen_name}>微博动态\n${nmb.text_raw}`)
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            await new Promise(resolve => setTimeout(resolve, 10 * 1000));
        }
    }
}