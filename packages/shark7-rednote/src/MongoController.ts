import {
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
        return await this.dbs.userDB.findOne({ shark7_id: uid });
    }
    async updateUserInfo(user: RednoteUser) {
        await this.dbs.userDB.updateOne(
            { shark7_id: user.shark7_id },
            [{ $replaceWith: user }],
            { upsert: true }
        );
    }
    async insertNote(data: RednoteNote) {
        return await this.dbs.notesDB.updateOne(
            { note_id: data.note_id },
            [{ $replaceWith: data }],
            { upsert: true }
        );
    }
    async insertNoteDetail(data: RednoteNoteDetail) {
        return await this.dbs.notesDetailDB.updateOne(
            { note_id: data.note_id },
            [{ $replaceWith: data }],
            { upsert: true }
        );
    }
    async insertComment(comment: RednoteComment) {
        return await this.dbs.commentsDB.updateOne(
            { id: comment.id },
            [{ $replaceWith: comment }],
            { upsert: true }
        );
    }
    async getNoteByUidAndTimeLimit(uid: string) {
        return await this.dbs.notesDetailDB
            .find({
                user: { user_id: uid },
                time: { $gt: new Date().getTime() - 48 * 60 * 60 * 1000 },
            })
            .toArray();
    }
    async getOneNoteByUid(uid: string) {
        return await this.dbs.notesDetailDB.findOne(
            { user: { user_id: uid } },
            { sort: { time: -1 } }
        );
    }
    async getCommentById(id: string) {
        return await this.dbs.commentsDB.findOne({ id: id });
    }
}
