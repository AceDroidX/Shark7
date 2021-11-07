import { User } from "./User";
import axios from "axios";

export class Users {
    users: User[];
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
        const user = await new User().initByUID(uid)
        this.users.push(user);
        return user
    }
    async addByRoomid(roomid: number) {
        const user = await new User().initByRoomid(roomid);
        this.users.push(user);
        return user
    }
    getUserByUID(uid: number): User {
        const result = this.users.find(user => user.uid === uid);
        if (result != undefined) {
            return result
        } else {
            return new User().init(0, '未找到用户', 0)
        }
    }
    getUserByRoomid(roomid: number): User {
        const result = this.users.find(user => user.roomid === roomid);
        if (result != undefined) {
            return result
        } else {
            return new User().init(0, '未找到用户', 0)
        }
    }
    toString() {
        return this.users.map(user => user.toString()).join("\n");
    }
}