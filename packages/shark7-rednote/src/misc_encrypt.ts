import { str as crc32Str } from "crc-32";
import * as CryptoJS from "crypto-js";

const lookup =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

class CustomFieldDecrypt {
    static randomStr(length: number): string {
        const alphabet =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        return Array.from({ length }, () =>
            alphabet.charAt(Math.floor(Math.random() * alphabet.length))
        ).join("");
    }

    static base36Encode(
        number: bigint,
        alphabet: string = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    ): string {
        if (number < 0n) {
            return "-" + this.base36Encode(-number, alphabet);
        }
        let base36 = "";
        const len = BigInt(alphabet.length);
        if (number === 0n) {
            return alphabet[0];
        }
        while (number > 0n) {
            const rem = number % len;
            base36 = alphabet[Number(rem)] + base36;
            number = number / len;
        }
        return base36;
    }

    static b64Encode(e: Uint8Array): string {
        const P = e.length;
        const W = P % 3;
        const U: string[] = [];
        const z = 16383;
        let H = 0;
        const Z = P - W;

        while (H < Z) {
            const end = H + z > Z ? Z : H + z;
            U.push(this.encodeChunk(e, H, end));
            H = end;
        }

        if (W === 1) {
            const F = e[P - 1];
            U.push(lookup[F >> 2] + lookup[(F << 4) & 63] + "==");
        } else if (W === 2) {
            const F = (e[P - 2] << 8) | e[P - 1];
            U.push(
                lookup[F >> 10] +
                    lookup[(F >> 4) & 63] +
                    lookup[(F << 2) & 63] +
                    "="
            );
        }

        return U.join("");
    }

    private static encodeChunk(e: Uint8Array, t: number, r: number): string {
        const m: string[] = [];
        for (let b = t; b < r; b += 3) {
            const n =
                (e[b] << 16) | ((e[b + 1] << 8) & 0xff00) | (e[b + 2] & 0xff);
            m.push(this.tripletToBase64(n));
        }
        return m.join("");
    }

    private static tripletToBase64(e: number): string {
        return (
            lookup[(e >> 18) & 63] +
            lookup[(e >> 12) & 63] +
            lookup[(e >> 6) & 63] +
            lookup[e & 63]
        );
    }
}

class CookieFieldEncrypt {
    static async getA1AndWebId(): Promise<[string, string]> {
        const timestamp = Date.now();
        const hexTimestamp = timestamp.toString(16);
        const randomPart = CustomFieldDecrypt.randomStr(30);
        const d = hexTimestamp + randomPart + "5" + "0" + "000";

        const crc = crc32Str(d) >>> 0;
        const crcStr = crc.toString(10);

        const g = (d + crcStr).substring(0, 52);
        const webId = CryptoJS.MD5(g).toString();

        return [g, webId];
    }
}

export class MiscEncrypt {
    static xB3TraceId(): string {
        const characters = "abcdef0123456789";
        return Array.from({ length: 16 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length))
        ).join("");
    }

    static searchId(): string {
        const timestamp = BigInt(Date.now());
        const shifted = timestamp << 64n;
        const t = BigInt(Math.floor(Math.random() * 2147483646));
        const sum = shifted + t;
        return CustomFieldDecrypt.base36Encode(sum);
    }

    static xXrayTraceId(xB3: string): string {
        return CryptoJS.MD5(xB3).toString();
    }
}

// 示例用法
async function test() {
    const [a1, webId] = await CookieFieldEncrypt.getA1AndWebId();
    console.log("a1:", a1);
    console.log("webId:", webId);

    const traceId = MiscEncrypt.xB3TraceId();
    console.log("x-b3-traceid:", traceId);

    const searchId = MiscEncrypt.searchId();
    console.log("search_id:", searchId);

    const xXrayTraceId = MiscEncrypt.xXrayTraceId(traceId);
    console.log("x-xray-traceid:", xXrayTraceId);
}
