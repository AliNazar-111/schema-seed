import { describe, it, expect } from 'vitest'
import { createSqliteAdapter, SqliteAdapter } from '../src/index.js'
import { existsSync, unlinkSync } from 'node:fs'

describe('adapter-sqlite', () => {
    const dbFile = ':memory:'

    it('should create an instance of SqliteAdapter', () => {
        const adapter = createSqliteAdapter(dbFile)
        expect(adapter).toBeInstanceOf(SqliteAdapter)
        expect(adapter.capabilities.returning).toBe(true)
    })

    it('should connect and introspect an empty database', async () => {
        const adapter = createSqliteAdapter(dbFile)
        await adapter.connect()
        const schema = await adapter.introspectSchema()
        expect(schema.tables).toEqual({})
        await adapter.disconnect()
    })

    it('should have required SqlAdapter methods', () => {
        const adapter = createSqliteAdapter(dbFile)
        expect(adapter.connect).toBeDefined()
        expect(adapter.introspectSchema).toBeDefined()
        expect(adapter.insertBatch).toBeDefined()
    })
})
