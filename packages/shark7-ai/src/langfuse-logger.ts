import { LogLevel, logger as LangfuseLoggerSingleton } from '@langfuse/core'
import { logger } from 'shark7-shared'

const LangfuseLogLevelMap = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
} as const

let isLangfuseLoggerConfigured = false

function getLangfuseLogLevel() {
    const raw = process.env['LANGFUSE_LOG_LEVEL']?.trim().toLowerCase() ?? 'info'
    return {
        raw,
        level: LangfuseLogLevelMap[raw as keyof typeof LangfuseLogLevelMap] ?? LogLevel.INFO,
    }
}

export function configureLangfuseLogger() {
    if (isLangfuseLoggerConfigured) return
    if (!process.env['LANGFUSE_SECRET_KEY'] || !process.env['LANGFUSE_PUBLIC_KEY']) return

    const { raw, level } = getLangfuseLogLevel()
    LangfuseLoggerSingleton.configure({
        level,
        prefix: 'Langfuse SDK',
        enableTimestamp: true,
    })
    isLangfuseLoggerConfigured = true
    logger.info(`已开启 Langfuse SDK 日志，级别=${raw}`)
}
