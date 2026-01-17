import {
    logger,
    MongoControllerBase,
    RednoteDBs,
    type RednoteComment,
    type RednoteNote,
    type RednoteNoteDetail,
    type RednoteUser,
} from "shark7-shared";

export class MongoController extends MongoControllerBase<RednoteDBs> {
    async run() {}
    async getUserInfoByUID(uid: string) {
        logger.debug("getUserInfoByUID: uid:" + uid);
        return await this.dbs.userDB.findOne({ shark7_id: uid });
    }
    async updateUserInfo(user: RednoteUser) {
        logger.debug("updateUserInfo: shark7_id:" + user.shark7_id);
        await this.dbs.userDB.updateOne(
            { shark7_id: user.shark7_id },
            [{ $replaceWith: user }],
            { upsert: true }
        );
    }
    async insertNote(data: RednoteNote) {
        logger.debug("insertNote: note_id:" + data.note_id);
        return await this.dbs.notesDB.updateOne(
            { note_id: data.note_id },
            [{ $replaceWith: data }],
            { upsert: true }
        );
    }
    async insertNoteDetail(data: RednoteNoteDetail) {
        logger.debug("insertNoteDetail: note_id:" + data.note_id);
        return await this.dbs.notesDetailDB.updateOne(
            { note_id: data.note_id },
            [{ $replaceWith: data }],
            { upsert: true }
        );
    }
    async insertComment(comment: RednoteComment) {
        logger.debug("insertComment: id:" + comment.id);
        return await this.dbs.commentsDB.updateOne(
            { id: comment.id },
            [{ $replaceWith: comment }],
            { upsert: true }
        );
    }
    async getNoteByUidAndTimeLimit(uid: string) {
        logger.debug("getNoteByUidAndTimeLimit: uid:" + uid);
        return await this.dbs.notesDetailDB
            .find({
                "user.user_id": uid,
                time: { $gt: new Date().getTime() - 48 * 60 * 60 * 1000 },
            })
            .toArray();
    }
    async getOneNoteByUid(uid: string) {
        logger.debug("getOneNoteByUid: uid:" + uid);
        return await this.dbs.notesDetailDB.findOne(
            { "user.user_id": uid },
            { sort: { time: -1 } }
        );
    }
    async getCommentById(id: string) {
        logger.debug("getCommentById: id:" + id);
        return await this.dbs.commentsDB.findOne({ id: id });
    }
    async getNoteById(note_id: string) {
        logger.debug("getNoteById: note_id:" + note_id);
        return await this.dbs.notesDB.findOne({ note_id });
    }
    async getNoteDetailById(note_id: string) {
        logger.debug("getNoteDetailById: note_id:" + note_id);
        return await this.dbs.notesDetailDB.findOne({ note_id });
    }
}
