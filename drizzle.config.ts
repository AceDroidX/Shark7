import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    dialect: 'postgresql',
    schema: './packages/shark7-shared/src/db/schema/*.ts',
    out: './drizzle',
    dbCredentials: {
        url: process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@127.0.0.1:5432/shark7',
    },
})
