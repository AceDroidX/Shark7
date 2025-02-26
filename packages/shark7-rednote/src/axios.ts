import axios from "axios";
import { cookieStrToJson, logAxiosError, logger } from "shark7-shared";
import { MiscEncrypt } from "./misc_encrypt";
import { rednoteWeb } from "./RednoteWeb";
import { XscEncrypt } from "./xsc_encrypt";

export const axios_rednote = axios.create({
    baseURL: "https://edith.xiaohongshu.com",
    headers: {
        "Content-Type": "application/json",
    },
});

axios_rednote.interceptors.request.use(async (config) => {
    const cookie = rednoteWeb?.cookie_str;
    if (!cookie) {
        logger.error("rednoteWeb cookie为空");
        process.exit(1);
    }
    const a1 = cookieStrToJson(cookie, ".xiaohongshu.com").find(
        (item) => item.name === "a1"
    )?.value;
    if (!a1) {
        logger.error("cookie中找不到a1");
        process.exit(1);
    }
    if (!config.url) {
        logger.error("url为空");
        process.exit(1);
    }
    if (!rednoteWeb) {
        logger.error("web为空");
        process.exit(1);
    }
    // const xt = new Date().getTime().toString();
    // const xs = encrypt_xs(config.url, config.data, a1, xt);
    const resp = await rednoteWeb.sign(config.url, config.data);
    const xt = resp["X-t"].toString();
    const xs = resp["X-s"];
    const xsc = XscEncrypt.encrypt_xsc({
        xs: xs,
        xt: xt,
        platform: "xhs-pc-web",
        a1: a1,
        x1: "3.8.7",
        x4: "4.44.1",
        b1: "",
    });
    const x_b3 = MiscEncrypt.xB3TraceId();
    const x_xray = MiscEncrypt.xXrayTraceId(x_b3);
    config.headers["x-s"] = xs;
    config.headers["x-t"] = xt;
    config.headers["x-s-common"] = xsc;
    config.headers["x-b3-traceid"] = x_b3;
    config.headers["x-xray-traceid"] = x_xray;
    config.headers["Cookie"] = cookie;
    config.headers["referer"] = "https://www.xiaohongshu.com/";
    config.headers["origin"] = "https://www.xiaohongshu.com";
    config.headers["user-agent"] =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
    return config;
});

axios_rednote.interceptors.response.use(
    (response) => {
        // if (response?.data?.code === 401) {

        //     return Promise.reject(response);
        // }
        // if (response?.data?.code === -2) {
        //     alert(`用户无权限访问\n${response?.data?.msg}`);
        //     return Promise.reject(response);
        // }
        return response;
    },
    (error) => {
        logAxiosError(error);
        return Promise.reject(error);
    }
);
