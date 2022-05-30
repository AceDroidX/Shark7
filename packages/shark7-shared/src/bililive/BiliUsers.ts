import { BiliUser } from "./BiliUser";

export class BiliUsers {
    users: BiliUser[];
    uidlist(): number[] {
        return this.users.map(user => user.uid);
    }
    roomidlist(): number[] {
        return this.users.map(user => user.roomid);
    }
    constructor() {
        this.users = [];
    }
    async addByUID(uid: number) {
        const user = await new BiliUser().initByUID(uid)
        this.users.push(user);
        return user
    }
    async addByRoomid(roomid: number) {
        const user = await new BiliUser().initByRoomid(roomid);
        this.users.push(user);
        return user
    }
    getUserByUID(uid: number): BiliUser {
        const result = this.users.find(user => user.uid === uid);
        if (result != undefined) {
            return result
        } else {
            return new BiliUser().init(0, '未找到用户', 0)
        }
    }
    getUserByRoomid(roomid: number): BiliUser {
        const result = this.users.find(user => user.roomid === roomid);
        if (result != undefined) {
            return result
        } else {
            return new BiliUser().init(0, '未找到用户', 0)
        }
    }
    toString() {
        return this.users.map(user => user.toString()).join("\n");
    }
}