import type {
    RednoteComment,
    RednoteNote,
    RednoteNoteDetail,
} from "shark7-shared";

export type RednoteApi<T> = {
    code: number;
    success: boolean;
    msg: string;
    data: T;
};

export type RednoteNotePage = {
    cursor: string;
    notes: RednoteNote[];
    has_more: boolean;
};

export type RednoteNoteDetailPage = {
    cursor_score: string;
    /** 只有一项的数组 */
    items: RednoteNoteDetailWarpper[];
    current_time: number;
};

export type RednoteNoteDetailWarpper = {
    id: "111111111111111111111";
    model_type: "note";
    note_card: RednoteNoteDetail;
};

export type RednoteCommentPage = {
    cursor: string;
    comments: RednoteComment[];
    has_more: boolean;
    time: number;
    user_id: string;
    xsec_token: string;
};

export type BrowserSign = { "X-s": string; "X-t": number };
