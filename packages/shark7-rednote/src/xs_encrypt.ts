import Crypto from "crypto-js";

// 已失效

const iv = Crypto.enc.Utf8.parse("4uzjr7mbsibcaldp");
const key = Crypto.lib.WordArray.create(
    [929260340, 1633971297, 895580464, 925905270], // words 数组
    16 // sigBytes 长度
);
const x2 = "0|0|0|1|0|0|1|0|0|0|1|0|0|0|0|1|0|0|0";
const obj = {
    signSvn: "56",
    signType: "x2",
    appID: "xhs-pc-web",
    signVersion: "1",
    payload: undefined,
};

function to_hex_str(encodedData: string) {
    const decodedData = Buffer.from(encodedData, "base64").toString("binary");
    let hexString = "";
    for (let i = 0; i < decodedData.length; i++) {
        hexString += decodedData.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hexString;
}

function getX1(url: string, payload?: string) {
    const message = payload ? `url=${url}${payload}` : `url=${url}`;
    console.log(message);
    const md5Hash = Crypto.MD5(message).toString(Crypto.enc.Hex);
    // console.log("md5Hash", md5Hash);
    return md5Hash;
}

export function encrypt_xs(
    url: string,
    payload: string | undefined,
    a1: string,
    ts: string
) {
    const x1 = getX1(url, payload);
    const xText = `x1=${x1};x2=${x2};x3=${a1};x4=${ts};`;
    const text = Crypto.enc.Utf8.parse(Buffer.from(xText).toString("base64"));

    const aes_result = Crypto.AES.encrypt(text, key, {
        iv: iv,
        mode: Crypto.mode.CBC,
        padding: Crypto.pad.Pkcs7,
    }).toString();
    // console.log("aes_result", aes_result);

    const finalObj = {
        ...obj,
        payload: to_hex_str(aes_result),
    };

    return (
        "XYW_" +
        Buffer.from(JSON.stringify(finalObj), "binary").toString("base64")
    );
}
