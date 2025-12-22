import { describe, it, expect } from 'vitest'
import { UniquenessRegistry } from './uniqueness.js'

describe('UniquenessRegistry', () => {
    it('should ensure unique values are generated', async () => {
        const registry = new UniquenessRegistry()
        const values = new Set()

        // Generator that returns 1, 1, 2, 3...
        let count = 0
        const generator = async () => {
            count++
            if (count === 1 || count === 2) return 1
            return count - 1
        }

        const val1 = await registry.ensureUnique('table', 'col', generator)
        const val2 = await registry.ensureUnique('table', 'col', generator)
        const val3 = await registry.ensureUnique('table', 'col', generator)

        expect(val1).toBe(1)
        expect(val2).toBe(2)
        expect(val3).toBe(3)

        values.add(val1)
        values.add(val2)
        values.add(val3)
        expect(values.size).toBe(3)
    })

    it('should use fallback when max retries exceeded', async () => {
        const registry = new UniquenessRegistry()
        const generator = async () => 'constant'

        const val1 = await registry.ensureUnique('table', 'col', generator, 5)
        const val2 = await registry.ensureUnique('table', 'col', generator, 5)

        expect(val1).toBe('constant')
        expect(val2).toBe('constant_1')
    })

    it('should clear registry', async () => {
        const registry = new UniquenessRegistry()
        const generator = async () => 'value'

        await registry.ensureUnique('table', 'col', generator)
        registry.clear('table', 'col')

        const val2 = await registry.ensureUnique('table', 'col', generator)
        expect(val2).toBe('value') // Should not be 'value_1'
    })
})
