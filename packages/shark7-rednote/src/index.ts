import {
    MongoControlClient,
    RednoteDBs,
    Scheduler,
    initLogger,
    logErrorDetail,
    logger,
} from "shark7-shared";
import {
    onCommentEvent,
    onNoteDetailEvent,
    onNoteEvent,
    onUserDBEvent,
} from "./event.ts";
import { fetchComment, fetchNote, fetchUser, getNote } from "./fetch.ts";
import { MongoController } from "./MongoController.ts";
import { initWeb } from "./RednoteWeb.ts";

process.on("uncaughtException", function (err) {
    //打印出错误
    if (err.name == "WeiboError") {
        logger.error(
            `Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`
        );
    } else {
        logErrorDetail("未捕获的错误", err);
        process.exit(1);
    }
});
// process.on('unhandledRejection', (reason, promise) => {
//     promise.catch((err) => {logger.error(err)});
//     logger.error(`Unhandled Rejection at:${promise}\nreason:${JSON.stringify(reason)}`);
//     process.exit(1);
// });
// init
if (import.meta.main) {
    main();
}
async function main() {
    const mongo = await MongoControlClient.getInstance(
        RednoteDBs,
        MongoController
    );

    initLogger("rednote");

    const uid = process.env["uid"];
    if (!uid) {
        logger.error("请设置uid");
        process.exit(1);
    }
    mongo.addUpdateChangeWatcher(mongo.ctr.dbs.userDB, onUserDBEvent);
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.notesDB, onNoteEvent);
    mongo.addInsertChangeWatcher(
        mongo.ctr.dbs.notesDetailDB,
        onNoteDetailEvent
    );
    mongo.addInsertChangeWatcher(mongo.ctr.dbs.commentsDB, onCommentEvent);
    await mongo.ctr.run();
    await initWeb();
    if (!(await fetchUser(mongo.ctr, uid))) {
        logger.error("fetchUser数据获取测试失败");
        process.exit(1);
    }
    if (!(await getNote(uid))) {
        logger.error("getNote数据获取测试失败");
        process.exit(1);
    }
    let interval = process.env["interval"]
        ? Number(process.env["interval"])
        : 60;
    const scheduler = new Scheduler();
    // 暂时关闭
    // scheduler.addJob("fetchUser", interval, () => {
    //     fetchUser(mongo.ctr, uid);
    // });
    scheduler.addJob("fetchNote", interval, () => {
        fetchNote(mongo.ctr, uid);
    });
    scheduler.addJob("fetchComment", interval, () => {
        fetchComment(mongo.ctr, uid);
    });
    logger.info("rednote模块已启动");
}
