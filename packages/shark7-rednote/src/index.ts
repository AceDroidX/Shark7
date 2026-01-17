import {
    MongoControlClient,
    RednoteDBs,
    Scheduler,
    initLogger,
    logErrorDetail,
    logger,
    Nats,
    createChangeTracker,
    Scope,
    type RednoteNote,
    type RednoteComment,
    type RednoteNoteDetail
} from "shark7-shared";
import {
    fetchComment,
    fetchNote,
    fetchNoteDetail,
    fetchUser,
    getNote
} from "./fetch.ts";
import { MongoController } from "./MongoController.ts";
import { initWeb } from "./RednoteWeb.ts";
import {
    formatRednoteUserChanges,
    createRednoteNoteEvent,
    createRednoteCommentEvent
} from "./formatters.ts";

process.on("uncaughtException", function (err) {
    if (err.name == "WeiboError") {
        logger.error(
            `Weibo模块出现致命错误:\nname:${err.name}\nmessage:${err.message}\nstack:${err.stack}`
        );
    } else {
        logErrorDetail("未捕获的错误", err);
        process.exit(1);
    }
});

if (import.meta.main) {
    main();
}
async function main() {
    const nc = await Nats.connect()
    const mongo = await MongoControlClient.getInstance(
        RednoteDBs,
        MongoController,
        nc
    );

    initLogger("rednote");

    const uid = process.env["uid"];
    if (!uid) {
        logger.error("请设置uid");
        process.exit(1);
    }
    
    const trackUserChange = createChangeTracker(
        async (newData) => mongo.ctr.getUserInfoByUID(newData.shark7_id),
        (data) => mongo.ctr.updateUserInfo(data),
        (event) => mongo.publishShark7Event(event),
        {
            formatter: formatRednoteUserChanges,
            scope: Scope.Rednote.User,
            name: (newData) => newData.basic_info.nickname
        }
    )

    const trackNoteChange = createChangeTracker<RednoteNote>(
        async (newData) => mongo.ctr.getNoteById(newData.note_id),
        (data) => mongo.ctr.insertNote(data),
        async (event) => {
            if (event) await mongo.publishShark7Event(event);
        }
    )

    const trackNoteDetailChange = createChangeTracker<RednoteNoteDetail>(
        async (newData) => mongo.ctr.getNoteDetailById(newData.note_id),
        (data) => mongo.ctr.insertNoteDetail(data),
        (event) => mongo.publishShark7Event(event),
        {
            onInsert: (newData) => createRednoteNoteEvent(newData.user.nickname, newData),
            onUpdateExtra: async (oldData, newData) => {
                await fetchNoteDetail(mongo.ctr, newData.note_id);
            }
        }
    )

    const trackCommentChange = createChangeTracker<RednoteComment>(
        async (newData) => mongo.ctr.getCommentById(newData.id),
        (data) => mongo.ctr.insertComment(data),
        (event) => mongo.publishShark7Event(event),
        {
            onInsert: (newData) => createRednoteCommentEvent(newData.user_info.nickname, newData)
        }
    )
    
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
    scheduler.addJob("fetchNote", interval, async () => {
        await fetchNote(mongo.ctr, uid);
    });
    scheduler.addJob("fetchComment", interval, async () => {
        await fetchComment(mongo.ctr, uid);
    });
    logger.info("rednote模块已启动");
}
