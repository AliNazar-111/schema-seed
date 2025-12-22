import { describe, it, expect } from 'vitest'
import { createMssqlAdapter, MssqlAdapter } from '../src/index.js'

describe('adapter-mssql', () => {
    it('should create an instance of MssqlAdapter', () => {
        const adapter = createMssqlAdapter('Server=localhost;Database=db;User Id=sa;Password=pass;')
        expect(adapter).toBeInstanceOf(MssqlAdapter)
        expect(adapter.capabilities.identityInsert).toBe(true)
    })

    it('should have required SqlAdapter methods', () => {
        const adapter = createMssqlAdapter('Server=localhost')
        expect(adapter.connect).toBeDefined()
        expect(adapter.introspectSchema).toBeDefined()
        expect(adapter.insertBatch).toBeDefined()
    })
})
