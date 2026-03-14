import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Client } from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')
const migrationsFolder = path.join(appRoot, 'drizzle')
const advisoryLockId = 728601407

function isTruthy(value: string | undefined, defaultValue = false) {
    if (value == null || value === '') {
        return defaultValue
    }

    return !['0', 'false', 'no', 'off'].includes(value.toLowerCase())
}

function getDatabaseUrl() {
    return process.env['DATABASE_URL'] ?? process.env['database_url'] ?? ''
}

function getTargetScript() {
    const pkg = process.env['PACKAGE']
    if (!pkg) {
        throw new Error('缺少 PACKAGE 环境变量')
    }

    return path.join(appRoot, `packages/shark7-${pkg}/src/index.ts`)
}

async function delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
}

async function runMigrationsIfNeeded() {
    const databaseUrl = getDatabaseUrl()
    const autoMigrate = isTruthy(process.env['AUTO_MIGRATE'], true)

    if (!autoMigrate) {
        console.log('[entrypoint] 已禁用自动迁移')
        return
    }

    if (!databaseUrl) {
        console.log('[entrypoint] 未配置 DATABASE_URL，跳过自动迁移')
        return
    }

    const maxRetries = Number(process.env['MIGRATION_MAX_RETRIES'] ?? '30')
    const retryDelayMs = Number(process.env['MIGRATION_RETRY_DELAY_MS'] ?? '2000')
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        const client = new Client({ connectionString: databaseUrl })

        try {
            console.log(`[entrypoint] 开始执行数据库迁移 attempt=${attempt}/${maxRetries}`)
            await client.connect()
            await client.query('select pg_advisory_lock($1)', [advisoryLockId])

            const db = drizzle(client)
            await migrate(db, { migrationsFolder })

            await client.query('select pg_advisory_unlock($1)', [advisoryLockId])
            await client.end()
            console.log('[entrypoint] 数据库迁移完成')
            return
        } catch (error) {
            lastError = error
            console.error(`[entrypoint] 数据库迁移失败 attempt=${attempt}/${maxRetries}:`, error)

            try {
                await client.query('select pg_advisory_unlock($1)', [advisoryLockId])
            } catch {
                // ignore unlock failures
            }

            try {
                await client.end()
            } catch {
                // ignore close failures
            }

            if (attempt < maxRetries) {
                await delay(retryDelayMs)
            }
        }
    }

    throw lastError ?? new Error('数据库迁移失败')
}

async function startApp() {
    const targetScript = getTargetScript()
    const child = spawn(process.execPath, [targetScript], {
        cwd: appRoot,
        env: process.env,
        stdio: 'inherit',
    })

    const forwardSignal = (signal: NodeJS.Signals) => {
        if (!child.killed) {
            child.kill(signal)
        }
    }

    process.once('SIGINT', forwardSignal)
    process.once('SIGTERM', forwardSignal)

    child.on('exit', (code, signal) => {
        if (signal) {
            process.kill(process.pid, signal)
            return
        }

        process.exit(code ?? 0)
    })

    child.on('error', (error) => {
        console.error('[entrypoint] 启动应用失败:', error)
        process.exit(1)
    })
}

export async function main() {
    await runMigrationsIfNeeded()
    await startApp()
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
    main().catch((error) => {
        console.error('[entrypoint] 启动失败:', error)
        process.exit(1)
    })
}
