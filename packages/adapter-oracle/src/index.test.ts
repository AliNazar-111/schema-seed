import { describe, it, expect } from 'vitest'
import { createOracleAdapter, OracleAdapter } from '../src/index.js'

describe('adapter-oracle', () => {
    it('should create an instance of OracleAdapter', () => {
        const adapter = createOracleAdapter({
            user: 'hr',
            password: 'hr',
            connectString: 'localhost/xe'
        })
        expect(adapter).toBeInstanceOf(OracleAdapter)
        expect(adapter.capabilities.deferrableConstraints).toBe(true)
    })

    it('should have required SqlAdapter methods', () => {
        const adapter = createOracleAdapter({ user: 'test' })
        expect(adapter.connect).toBeDefined()
        expect(adapter.introspectSchema).toBeDefined()
        expect(adapter.insertBatch).toBeDefined()
    })
})
