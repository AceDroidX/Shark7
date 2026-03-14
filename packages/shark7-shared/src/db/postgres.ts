import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'
import { logger } from '../logger.ts'
import * as schema from './schema/index.ts'

export { schema as pgSchema }

export type Shark7PgDatabase = NodePgDatabase<typeof schema>

export function getPostgresConnectionString() {
    return process.env['DATABASE_URL'] ?? process.env['database_url']
}

export function getPostgresPoolConfig(): PoolConfig {
    const connectionString = getPostgresConnectionString()
    if (connectionString) {
        return {
            connectionString,
            max: Number(process.env['PGPOOL_MAX'] ?? '10'),
        }
    }

    return {
        host: process.env['PGHOST'] ?? process.env['POSTGRES_HOST'] ?? '127.0.0.1',
        port: Number(process.env['PGPORT'] ?? process.env['POSTGRES_PORT'] ?? '5432'),
        user: process.env['PGUSER'] ?? process.env['POSTGRES_USER'] ?? 'postgres',
        password: process.env['PGPASSWORD'] ?? process.env['POSTGRES_PASSWORD'] ?? 'postgres',
        database: process.env['PGDATABASE'] ?? process.env['POSTGRES_DB'] ?? 'shark7',
        max: Number(process.env['PGPOOL_MAX'] ?? '10'),
    }
}

export function createPostgresPool(config: PoolConfig = getPostgresPoolConfig()) {
    return new Pool(config)
}

export function createPostgresDb(pool: Pool = createPostgresPool()) {
    return drizzle(pool, { schema })
}

export async function createPostgresClient() {
    const pool = createPostgresPool()
    const db = createPostgresDb(pool)
    await pool.query('select 1')
    logger.info('PostgreSQL 已连接')
    return { pool, db }
}
