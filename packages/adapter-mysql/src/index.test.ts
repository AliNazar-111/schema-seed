import { describe, it, expect } from 'vitest'
import { createMySqlAdapter, MySqlAdapter } from '../src/index.js'

describe('adapter-mysql', () => {
    it('should create an instance of MySqlAdapter', () => {
        const adapter = createMySqlAdapter('mysql://user:pass@localhost:3306/db')
        expect(adapter).toBeInstanceOf(MySqlAdapter)
        expect(adapter.capabilities.deferrableConstraints).toBe(false)
    })

    it('should have required SqlAdapter methods', () => {
        const adapter = createMySqlAdapter('mysql://localhost')
        expect(adapter.connect).toBeDefined()
        expect(adapter.introspectSchema).toBeDefined()
        expect(adapter.insertBatch).toBeDefined()
    })
})
