import axios from "axios";
import {
    logAxiosError,
    logErrorDetail,
    logger,
    type RednoteComment,
    type RednoteNote,
    type RednoteNoteDetail,
    type RednoteUser,
} from "shark7-shared";
import { MongoController } from "./MongoController.ts";
import { axios_rednote } from "./axios.ts";
import type {
    RednoteApi,
    RednoteCommentPage,
    RednoteNoteDetailPage,
    RednoteNotePage,
} from "./model.ts";

let xsec_token: string | undefined;

export async function fetchUser(
    ctr: MongoController,
    sec_uid: string
): Promise<boolean> {
    logger.debug("fetchUser:" + sec_uid);
    const data = await getUser(sec_uid);
    if (!data) return false;
    await ctr.updateUserInfo(data);
    return true;
}

export async function fetchNote(
    ctr: MongoController,
    sec_uid: string
): Promise<boolean> {
    logger.debug("fetchNote:" + sec_uid);
    const data = await getNote(sec_uid);
    if (!data) return false;
    for (const item of data) {
        await ctr.insertNote(item);
    }
    return true;
}

export async function fetchNoteDetail(
    ctr: MongoController,
    sec_uid: string
): Promise<boolean> {
    logger.debug("fetchNoteDetail:" + sec_uid);
    const data = await getNoteDetail(sec_uid);
    if (!data) return false;
    await ctr.insertNoteDetail(data);
    return true;
}

export async function fetchComment(
    ctr: MongoController,
    uid: string
): Promise<boolean> {
    logger.debug("fetchComment:" + uid);
    let isSuccess = true;
    async function getCommentTask() {
        const timeNoteList = await ctr.getNoteByUidAndTimeLimit(uid);
        logger.debug(
            "fetchComment: timeNoteList.length:" + timeNoteList?.length
        );
        if (timeNoteList.length > 0) {
            return timeNoteList.map((item) => getComment(item.note_id));
        } else {
            const one = await ctr.getOneNoteByUid(uid);
            if (!one) {
                logger.warn("fetchComment: getOneNoteByUid is null");
                isSuccess = false;
                return [];
            }
            return [getComment(one.note_id)];
        }
    }
    const task = await getCommentTask();
    logger.debug("fetchComment: task.length:" + task.length);
    const result = await Promise.all(task);
    let comments: RednoteComment[] = [];
    for (const item of result) {
        if (!item) {
            logger.warn("fetchComment: some result is null");
            isSuccess = false;
            continue;
        }
        for (const comment of item) {
            if ("sub_comments" in comment) {
                comments = comments.concat(comment.sub_comments);
            }
            comments.push(comment);
        }
    }
    for (const item of comments) {
        if (item.user_info.user_id != uid) continue;
        if ("target_comment" in item) {
            const newComment: RednoteComment = {
                ...item,
                target_comment: {
                    ...item.target_comment,
                    shark7_raw: comments.find(
                        (c) => c.id == item.target_comment.id
                    ),
                },
            };
            if (!newComment.target_comment.shark7_raw) {
                logger.warn("fetchComment: target_comment.shark7_raw is null");
                isSuccess = false;
            }
            await ctr.insertComment(newComment);
        } else {
            await ctr.insertComment(item);
        }
    }
    return isSuccess;
}

export async function getUser(uid: string): Promise<RednoteUser | null> {
    logger.debug("getUser:" + uid);
    try {
        const data = { target_user_id: uid };
        const resp = await axios_rednote.get<RednoteApi<RednoteUser>>(
            `/api/sns/web/v1/user/otherinfo?${new URLSearchParams(data)}`
        );
        // console.log(JSON.stringify(resp.data.data));
        return {
            ...resp.data.data,
            shark7_id: uid,
        };
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err);
        } else {
            logErrorDetail("抓取数据失败", err);
        }
        return null;
    }
}

export async function getNote(uid: string): Promise<RednoteNote[] | null> {
    logger.debug("getNote:" + uid);
    try {
        const data = {
            num: "30",
            cursor: "",
            user_id: uid,
            image_formats: "jpg,webp,avif",
        };
        const resp = await axios_rednote.get<RednoteApi<RednoteNotePage>>(
            `/api/sns/web/v1/user_posted?${new URLSearchParams(data)}`
        );
        xsec_token = resp.data.data.notes[0].xsec_token;
        return resp.data.data.notes;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err);
        } else {
            logErrorDetail("抓取数据失败", err);
        }
        return null;
    }
}

export async function getNoteDetail(
    note_id: string
): Promise<RednoteNoteDetail | null> {
    try {
        logger.debug("getNoteDetail:" + note_id);
        if (!xsec_token) {
            logger.error("xsec_token不存在");
            return null;
        }
        const data = {
            source_note_id: note_id,
            image_formats: ["jpg", "webp", "avif"],
            extra: { need_body_topic: "1" },
            xsec_source: "pc_user",
            xsec_token: xsec_token,
        };
        const resp = await axios_rednote.post<
            RednoteApi<RednoteNoteDetailPage>
        >(`/api/sns/web/v1/feed`, data);
        return resp.data.data.items[0].note_card;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err);
        } else {
            logErrorDetail("抓取数据失败", err);
        }
        return null;
    }
}

export async function getComment(
    note_id: string
): Promise<RednoteComment[] | null> {
    try {
        logger.debug("getComment:" + note_id);
        if (!xsec_token) {
            logger.error("xsec_token不存在");
            return null;
        }
        const data = {
            // num: "30",
            cursor: "",
            note_id: note_id,
            image_formats: "jpg,webp,avif",
            xsec_token: xsec_token,
        };
        const resp = await axios_rednote.get<RednoteApi<RednoteCommentPage>>(
            `/api/sns/web/v2/comment/page?${new URLSearchParams(data)}`
        );
        return resp.data.data.comments;
    } catch (err) {
        if (axios.isAxiosError(err)) {
            logAxiosError(err);
        } else {
            logErrorDetail("抓取数据失败", err);
        }
        return null;
    }
}
