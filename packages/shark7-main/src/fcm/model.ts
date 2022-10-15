type FcmSendBody = {
    validate_only?: boolean,
    message: Message
}

type Message = {
    data?: { [key: string]: string },
    notification?: Notification,
    android?: {
    },
    webpush?: {
    },
    apns?: {
    },
    fcm_options?: {
    },
} & ({ token: string } | { topic: string } | { condition: string })

type Notification = {
    title?: string,
    body?: string,
    image?: string
}
