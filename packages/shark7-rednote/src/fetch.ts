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
import { MongoController } from "./MongoController";
import { axios_rednote } from "./axios";
import type {
    RednoteApi,
    RednoteCommentPage,
    RednoteNoteDetailPage,
    RednoteNotePage,
} from "./model";

let xsec_token: string | undefined;

export async function fetchUser(
    ctr: MongoController,
    sec_uid: string
): Promise<boolean> {
    const data = await getUser(sec_uid);
    if (!data) return false;
    await ctr.updateUserInfo(data);
    return true;
}

export async function fetchNote(
    ctr: MongoController,
    sec_uid: string
): Promise<boolean> {
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
    const data = await getNoteDetail(sec_uid);
    if (!data) return false;
    await ctr.insertNoteDetail(data);
    return true;
}

export async function fetchComment(
    ctr: MongoController,
    uid: string
): Promise<boolean> {
    const list = await ctr.getNoteByUidAndTimeLimit(uid);
    const task = list
        ? list.map(async (item) => {
              const data = await getComment(item.note_id);
              if (!data) return false;
              for (const item of data) {
                  await ctr.insertComment(item);
              }
              return true;
          })
        : [await ctr.getOneNoteByUid(uid)];
    return (await Promise.all(task)).every((item) => item);
}

export async function getUser(uid: string): Promise<RednoteUser | null> {
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
