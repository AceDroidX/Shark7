import { MongoDBs } from "shark7-shared";
import { MongoControllerBase } from 'shark7-shared';
import { EventProcessor } from "./event";

export {
    MongoController
};

class MongoController extends MongoControllerBase<MongoDBs> {
    ep: EventProcessor
    constructor(eventProcessor: EventProcessor, dbs: MongoDBs) {
        super(dbs)
        this.ep = eventProcessor
    }
    run() {
        // https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
        this.dbs.weibo.event.watch().on("change", this.ep.onEventChange.bind(this.ep));
        this.dbs.apex.event.watch().on("change", this.ep.onEventChange.bind(this.ep))
        this.dbs.bililive.event.watch().on("change", this.ep.onEventChange.bind(this.ep))
        this.dbs.bilibili.event.watch().on("change", this.ep.onEventChange.bind(this.ep))
        this.dbs.douyin.event.watch().on("change", this.ep.onEventChange.bind(this.ep))
        this.dbs.netease_music.event.watch().on("change", this.ep.onEventChange.bind(this.ep))
    }
}
