import { BiliSimpleUser } from ".";

export class BiliUsers {
    users: BiliSimpleUser[];
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
        const user = await BiliSimpleUser.initByUID(uid)
        if (!user) return user
        this.users.push(user);
        return user
    }
    async addByRoomid(roomid: number) {
        const user = await BiliSimpleUser.initByRoomid(roomid)
        if (!user) return user
        this.users.push(user);
        return user
    }
    getUserByUID(uid: number): BiliSimpleUser | undefined {
        return this.users.find(user => user.uid === uid)
    }
    getUserByRoomid(roomid: number): BiliSimpleUser | undefined {
        return this.users.find(user => user.roomid === roomid)
    }
    toString() {
        return this.users.map(user => user.toString()).join("\n");
    }
}
