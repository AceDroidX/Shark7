import type {
    ChangeStreamInsertDocument,
    ChangeStreamUpdateDocument,
} from "mongodb";
import type {
    RednoteComment,
    RednoteNote,
    RednoteNoteDetail,
    RednoteUser,
    Shark7Event,
} from "shark7-shared";
import { Scope, flattenObj, logger } from "shark7-shared";
import { MongoController } from "./MongoController";
import { fetchNoteDetail } from "./fetch";

export async function onUserDBEvent(
    ctr: MongoController,
    event: ChangeStreamUpdateDocument<RednoteUser>,
    origin?: RednoteUser
): Promise<Shark7Event | null> {
    const user = event.fullDocument;
    const updated = event.updateDescription.updatedFields;
    if (!user) {
        logger.error(`fullDocument为${user}`);
        process.exit(1);
    }
    if (!updated) {
        logger.error(`updatedFields为${user}`);
        process.exit(1);
    }
    logger.debug(`用户发生变化\n${JSON.stringify(event)}\n${JSON.stringify(origin)}`);
    const flattenOrigin = flattenObj(origin);
    var result: string[] = [];
    Object.entries(updated).forEach((item) => {
        const key = item[0];
        const value = item[1];
        if (key.startsWith("shark7_")) {
            return;
        }
        // const isSkip = ['cover_url', 'white_cover_url', 'share_info', 'urge_detail.ctl_map'].some(value => key.startsWith(value))
        // if (isSkip) return
        // if ((flattenOrigin[key] != null && value == null) || (flattenOrigin[key] == null && value != null)) {
        //     if(['city', 'commerce_user_info', 'country','ip_location','cover_and_head_image_info','general_permission',
        //     'life_story_block','original_musician','province','special_state_info','tab_settings',
        //     'urge_detail','video_icon','enable_ai_double','profile_show','social_real_relation_type'].some(value => key==value)) return
        // }
        if (JSON.stringify(value) == "[]" || JSON.stringify(value) == "{}") {
            return;
        }
        if (flattenOrigin[key] == value) {
            return;
        }
        logger.info(
            `${key}更改\n原：${JSON.stringify(
                flattenOrigin[key]
            )}\n现：${JSON.stringify(value)}`
        );
        result.push(
            `${key}更改\n原：${JSON.stringify(
                flattenOrigin[key]
            )}\n现：${JSON.stringify(value)}`
        );
    });
    if (result.length == 0) return null;
    return {
        ts: Number(new Date()),
        name: String(user.basic_info.nickname),
        scope: Scope.Rednote.User,
        msg: result.join("\n"),
    };
}

export async function onNoteEvent(
    ctr: MongoController,
    event: ChangeStreamInsertDocument<RednoteNote>
): Promise<Shark7Event | null> {
    const data = event.fullDocument;
    if (!data) {
        logger.error(`fullDocument为${data}`);
        process.exit(1);
    }
    while (!(await fetchNoteDetail(ctr, data.note_id))) {}
    return null;
}

export async function onNoteDetailEvent(
    ctr: MongoController,
    event: ChangeStreamInsertDocument<RednoteNoteDetail>
): Promise<Shark7Event | null> {
    const data = event.fullDocument;
    if (!data) {
        logger.error(`fullDocument为${data}`);
        process.exit(1);
    }
    const content = data.title + "\n" + data.desc;
    let type: string;
    switch (data.type) {
        case "video":
            type = "小红书视频";
            break;
        case "normal":
            type = "小红书动态";
            break;
        default:
            logger.warn("未知类型" + data.type);
            type = data.type;
            break;
    }
    const msg = `${type}\n${content}}`;
    return {
        ts: Number(new Date()),
        name: data.user.nickname,
        scope: Scope.Rednote.Note,
        msg,
    };
}

export async function onCommentEvent(
    ctr: MongoController,
    event: ChangeStreamInsertDocument<RednoteComment>
): Promise<Shark7Event | null> {
    const data = event.fullDocument;
    if (!data) {
        logger.error(`fullDocument为${data}`);
        process.exit(1);
    }
    let msg = data.content;
    if ("target_comment" in data) {
        const origin = await ctr.getCommentById(data.target_comment.id);
        msg =
            `原评论<${data.target_comment.user_info.nickname}>:\n${
                origin?.content ?? `评论获取失败:${data.target_comment.id}`
            }\n回复:\n` + msg;
    }
    return {
        ts: Number(new Date()),
        name: data.user_info.nickname,
        scope: Scope.Rednote.Comment,
        msg,
    };
}
