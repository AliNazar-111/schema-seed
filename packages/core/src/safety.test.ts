import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runSeedSql } from './runner.js'
import { Redactor } from './redaction.js'

describe('Safety Features', () => {
    describe('Redaction', () => {
        it('should redact sensitive column names', () => {
            expect(Redactor.isSensitive('password')).toBe(true)
            expect(Redactor.isSensitive('user_token')).toBe(true)
            expect(Redactor.isSensitive('api_key')).toBe(true)
            expect(Redactor.isSensitive('secret_field')).toBe(true)
            expect(Redactor.isSensitive('auth_code')).toBe(true)
            expect(Redactor.isSensitive('session_cookie')).toBe(true)
            expect(Redactor.isSensitive('username')).toBe(false)
        })

        it('should redact values in a row', () => {
            const row = {
                id: 1,
                username: 'john',
                password: 'secret123',
                api_key: 'key-456'
            }
            const redacted = Redactor.redactRow(row)
            expect(redacted.id).toBe(1)
            expect(redacted.username).toBe('john')
            expect(redacted.password).toBe('[REDACTED]')
            expect(redacted.api_key).toBe('[REDACTED]')
        })
    })

    describe('Production Safety', () => {
        const originalEnv = process.env.NODE_ENV

        beforeEach(() => {
            vi.resetModules()
        })

        afterEach(() => {
            process.env.NODE_ENV = originalEnv
        })

        it('should throw error if NODE_ENV is production', async () => {
            process.env.NODE_ENV = 'production'
            const adapter = { connect: vi.fn(), disconnect: vi.fn() } as any
            const options = { allowProduction: false }

            await expect(runSeedSql(adapter, {}, { insertOrder: [] } as any, options, {} as any))
                .rejects.toThrow('Refusing to run in production environment')
        })

        it('should allow production if allowProduction is true', async () => {
            process.env.NODE_ENV = 'production'
            const adapter = {
                connect: vi.fn().mockResolvedValue(undefined),
                disconnect: vi.fn().mockResolvedValue(undefined),
                begin: vi.fn().mockResolvedValue(undefined),
                commit: vi.fn().mockResolvedValue(undefined)
            } as any
            const options = { allowProduction: true, dryRun: false }

            const report = await runSeedSql(adapter, { tables: {} }, { insertOrder: [] } as any, options, {
                generators: {},
                inferGenerator: vi.fn()
            } as any)
            expect(report.success).toBe(true)
        })

        it('should throw error if DB host looks like production', async () => {
            const adapter = {
                connect: vi.fn(),
                disconnect: vi.fn(),
                config: { connectionString: 'postgres://db.production.myapp.com/db' }
            } as any
            const options = { allowProduction: false }

            await expect(runSeedSql(adapter, {}, { insertOrder: [] } as any, options, {} as any))
                .rejects.toThrow('Refusing to run against a potential production database')
        })
    })
})
