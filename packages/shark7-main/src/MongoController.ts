import { MongoControllerBase, MongoDBs } from "shark7-shared/dist/database"
import { onEventChange } from "./event"

export {
    MongoController
}

class MongoController extends MongoControllerBase<MongoDBs> {
    run() {
        this.dbs.weibo.event.watch().on("change", onEventChange);
        this.dbs.apex.event.watch().on("change", onEventChange)
        this.dbs.bililive.event.watch().on("change", onEventChange)
        this.dbs.douyin.event.watch().on("change", onEventChange)
    }
}
