import { describe, it, expect } from 'vitest'
import { createPostgresAdapter, PostgresAdapter } from '../src/index.js'

describe('adapter-postgres', () => {
    it('should create an instance of PostgresAdapter', () => {
        const adapter = createPostgresAdapter('postgres://user:pass@localhost:5432/db')
        expect(adapter).toBeInstanceOf(PostgresAdapter)
        expect(adapter.capabilities.deferrableConstraints).toBe(true)
    })

    it('should have required SqlAdapter methods', () => {
        const adapter = createPostgresAdapter('postgres://localhost')
        expect(adapter.connect).toBeDefined()
        expect(adapter.introspectSchema).toBeDefined()
        expect(adapter.insertBatch).toBeDefined()
    })
})
