import { describe, it, expect } from 'vitest'
import { Random } from '@alinazar-111/schema-seed-core'
import { generators } from '../src/index.js'

describe('generators', () => {
    it('should be deterministic with the same seed', () => {
        const seed = 'test-seed'
        const r1 = new Random(seed)
        const r2 = new Random(seed)

        const ctx1 = { random: r1 }
        const ctx2 = { random: r2 }

        for (let i = 0; i < 10; i++) {
            expect(generators.fullName(ctx1)).toBe(generators.fullName(ctx2))
            expect(generators.email(ctx1)).toBe(generators.email(ctx2))
            expect(generators.uuid(ctx1)).toBe(generators.uuid(ctx2))
        }
    })

    it('should produce different values with different seeds', () => {
        const r1 = new Random('seed-1')
        const r2 = new Random('seed-2')

        const ctx1 = { random: r1 }
        const ctx2 = { random: r2 }

        // Statistically likely to be different
        expect(generators.fullName(ctx1)).not.toBe(generators.fullName(ctx2))
    })

    it('should respect ranges', () => {
        const r = new Random('range-test')
        const ctx = { random: r }

        for (let i = 0; i < 100; i++) {
            const val = generators.intRange(ctx, 10, 20)
            expect(val).toBeGreaterThanOrEqual(10)
            expect(val).toBeLessThanOrEqual(20)
        }
    })
})
