import { describe, it, expect } from 'vitest'
import { UniquenessRegistry, Redactor } from '../src/index.js'

describe('core primitives', () => {
    describe('UniquenessRegistry', () => {
        it('should ensure unique values with retries', async () => {
            const registry = new UniquenessRegistry()
            let count = 0
            const generator = () => {
                count++
                return count <= 3 ? 'constant' : `value-${count}`
            }

            // First call: 'constant'
            const v1 = await registry.ensureUnique('t', 'c', generator)
            expect(v1).toBe('constant')

            // Second call: generator returns 'constant' (retry 1), then 'constant' (retry 2), then 'value-4'
            const v2 = await registry.ensureUnique('t', 'c', generator)
            expect(v2).toBe('value-4')
        })

        it('should use deterministic fallback when retries are exhausted', async () => {
            const registry = new UniquenessRegistry()
            const generator = () => 'constant'

            const v1 = await registry.ensureUnique('t', 'c', generator, 5)
            expect(v1).toBe('constant')

            const v2 = await registry.ensureUnique('t', 'c', generator, 5)
            expect(v2).toBe('constant_1')
        })
    })

    describe('Redactor', () => {
        it('should redact sensitive columns', () => {
            const row = {
                id: 1,
                username: 'john_doe',
                password: 'secret_password',
                api_key: '12345',
                email: 'john@example.com'
            }

            const redacted = Redactor.redactRow(row)
            expect(redacted.id).toBe(1)
            expect(redacted.username).toBe('john_doe')
            expect(redacted.password).toBe('[REDACTED]')
            expect(redacted.api_key).toBe('[REDACTED]')
            expect(redacted.email).toBe('john@example.com')
        })
    })
})
