import axios, { AxiosResponse } from 'axios'
import * as jose from 'jose'
import { Shark7Event } from 'shark7-shared'
import logger from 'shark7-shared/dist/logger'
import { getScopeName } from 'shark7-shared/dist/scope'
import { logErrorDetail } from 'shark7-shared/dist/utils'
import { AndroidMessagePriority, Message, Notification } from './model'

const fcm_oauth_host = process.env['fcm_oauth_host'] ? process.env['fcm_oauth_host'] : "https://oauth2.googleapis.com"
const fcm_host = process.env['fcm_host'] ? process.env['fcm_host'] : "https://fcm.googleapis.com"

const oauth_resp_example = {
    "access_token": "1/8xbJqaOZXSUZbHLl5EOtu1pxz3fmmetKx9W8CV4t79M",
    "scope": "https://www.googleapis.com/auth/prediction",
    "token_type": "Bearer",
    "expires_in": 3600
}
type OauthResponse = typeof oauth_resp_example

function formatMultipart(token: string, fcm_project_id: string, content: string): string {
    return `--subrequest_boundary
Content-Type: application/http
Content-Transfer-Encoding: binary
Authorization: Bearer ${token}

POST /v1/projects/${fcm_project_id}/messages:send
Content-Type: application/json
accept: application/json

${content}\n`
}

export class FcmClient {
    oauthToken: { token: string, expire_to: number } | undefined;
    fcm_private_key: string
    fcm_project_id: string
    fcm_client_email: string

    constructor() {
        logger.debug('实例化FcmClient')
        if (!process.env['fcm_private_key']) {
            logger.error('fcm_private_key未设置')
            process.exit(1)
        }
        this.fcm_private_key = process.env['fcm_private_key']
        if (!process.env['fcm_project_id']) {
            logger.error('fcm_project_id未设置')
            process.exit(1)
        }
        this.fcm_project_id = process.env['fcm_project_id']
        if (!process.env['fcm_client_email']) {
            logger.error('fcm_client_email未设置')
            process.exit(1)
        }
        this.fcm_client_email = process.env['fcm_client_email']
        jose.importPKCS8(this.fcm_private_key, "RS256").catch((e) => logErrorDetail('fcm_private_key加载失败', e))
    }

    async getToken(): Promise<string | null> {
        try {
            logger.debug('获取FcmToken')
            const RSAPrivateKey = await jose.importPKCS8(this.fcm_private_key, "RS256")
            const jwt = await new jose.SignJWT({ 'scope': 'https://www.googleapis.com/auth/firebase.messaging' })
                .setProtectedHeader({ alg: 'RS256' })
                .setIssuedAt()
                .setIssuer(this.fcm_client_email)
                .setAudience('https://oauth2.googleapis.com/token')
                .setExpirationTime('1h')
                .sign(RSAPrivateKey)
            const resp = await axios.post<OauthResponse>(`${fcm_oauth_host}/token`, `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`)
            if (resp.status != 200) {
                logger.error(resp.status.toString())
                return null
            }
            this.oauthToken = { token: resp.data.access_token, expire_to: Date.now() + 3600 * 1000 }
            return resp.data.access_token
        } catch (err) {
            if (axios.isAxiosError(err)) logger.warn('FcmToken:请求错误\n' + JSON.stringify(err.toJSON()))
            else logErrorDetail('FcmToken失败', err)
            return null
        }
    }

    msgToFormStr(msg: Message[], token: string): string {
        let result = ''
        msg.forEach(item => {
            result += formatMultipart(token, this.fcm_project_id, JSON.stringify({ message: item }))
        })
        result += '--subrequest_boundary--'
        return result
    }

    async sendAxiosRequest(msg: Message | Message[], token: string): Promise<AxiosResponse> {
        logger.debug('sendAxiosRequest' + JSON.stringify(msg));
        if (Array.isArray(msg)) {
            const config = { headers: { "Content-Type": "multipart/mixed; boundary=subrequest_boundary" }, transformResponse: (r: any) => r }
            const payload = this.msgToFormStr(msg, token)
            return await axios.post(`${fcm_host}/batch`, payload, config)
        } else {
            const config = { headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${token}` }, transformResponse: (r: any) => r }
            const payload = { "message": msg }
            return await axios.post(`${fcm_host}/v1/projects/${this.fcm_project_id}/messages:send`, payload, config)
        }
    }

    async sendMsg(msg: Message | Message[]): Promise<boolean> {
        try {
            logger.debug('fcm:sendMsg')
            if (!this.oauthToken) if (!await this.getToken()) return false
            if (!this.oauthToken) return false
            if (Date.now() > this.oauthToken.expire_to) if (!await this.getToken()) return false
            const resp = await this.sendAxiosRequest(msg, this.oauthToken.token)
            logger.debug(resp.data);
            if (resp.status != 200) {
                logger.error(resp.status.toString())
                return false
            }
            return true
        } catch (err) {
            if (axios.isAxiosError(err)) logger.warn('sendMsg失败:请求错误\n' + JSON.stringify(err.toJSON()))
            else logErrorDetail('sendMsg失败', err)
            return false
        }
    }

    notificationToMsg(notification: Notification, topic = 'main'): Message {
        return { notification, 'android': { priority: AndroidMessagePriority.HIGH }, topic }
    }

    dataToMsg(data: { [key: string]: string }, topic = 'main'): Message {
        return { data, 'android': { priority: AndroidMessagePriority.HIGH }, topic }
    }

    async sendEvent(event: Shark7Event, topic = 'main'): Promise<boolean> {
        let scopename = getScopeName(event.scope)
        if (!scopename) {
            logger.warn(`未知scopename:${event}`)
            scopename = event.scope
        }
        let eventStr = {
            ts: String(event.ts),
            name: event.name,
            scope: event.scope,
            msg: event.msg,
        }
        const msgs = [this.dataToMsg(eventStr, topic),
        this.notificationToMsg({ title: `<${event.name}>(${scopename})`, body: event.msg }, topic)]
        return this.sendMsg(msgs)
    }
}

// send multiple
// https://github.com/axios/axios/issues/789
// https://firebase.google.com/docs/cloud-messaging/send-message
