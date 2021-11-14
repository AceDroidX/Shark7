import { GuardState } from './model';
import logger from '../logger';

export class GuardList {
    list: GuardState[] = [];
    roomid: number;
    marked_uid: number[];
    competed(): boolean {
        return this.list.length == this.marked_uid.length;
    }
    isUIDinMarkList(uid: number): boolean {
        // return this.marked_uid.indexOf(uid) != -1;
        return this.marked_uid.includes(uid);
    }
    addGuard(uid: number, isOnline: number): void {
        this.list.push(new GuardState(uid, this.roomid, isOnline));
    }
    fillEmpty(): void {
        this.marked_uid.forEach(uid => {
            if (this.list.findIndex(item => item.uid == uid) == -1) {
                this.addGuard(uid, 2);
            }
        });
    }
    pageFilter(page: any): GuardList {
        var result = page.some((element: any) => {
            if (this.isUIDinMarkList(element['uid'])) {
                this.addGuard(element['uid'], element['is_alive']);
                logger.debug(`uid:${element['uid']}`);
                if (this.competed()) {
                    return true;
                }
            }
        });
        return this;
    }
    constructor(roomid: number, marked_uid: number[]) {
        this.roomid = roomid;
        this.marked_uid = marked_uid;
    }
}
