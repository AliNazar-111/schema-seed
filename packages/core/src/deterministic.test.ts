import { describe, it, expect } from 'vitest'
import { Random } from './random.js'
import { generateRows } from './generate/row.js'
import { NormalizedSqlType, TableSchema } from './types.js'

describe('Deterministic Generation', () => {
    it('Random should produce same sequence for same seed', () => {
        const seed = 'my-seed'
        const rng1 = new Random(seed)
        const rng2 = new Random(seed)

        for (let i = 0; i < 10; i++) {
            expect(rng1.next()).toBe(rng2.next())
            expect(rng1.nextInt(0, 100)).toBe(rng2.nextInt(0, 100))
        }
    })

    it('generateRows should be deterministic with same seed', async () => {
        const table: TableSchema = {
            name: 'users',
            columns: {
                id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: true },
                name: { name: 'name', type: NormalizedSqlType.STRING, rawType: 'varchar', nullable: false, isAutoIncrement: false },
            },
            foreignKeys: [],
            uniqueConstraints: []
        }

        const context = {
            random: new Random('seed'),
            uniqueness: { ensureUnique: (t: any, c: any, g: any) => g() } as any,
            refs: { getReference: () => null, addReference: () => { } } as any,
            generators: {
                string: () => 'fixed-string',
                int: () => 123
            },
            inferGenerator: (name: string) => ({ generatorId: name === 'name' ? 'string' : 'int' })
        }

        const rows1 = await generateRows(table, 5, context)

        // Reset context with same seed
        context.random = new Random('seed')
        const rows2 = await generateRows(table, 5, context)

        expect(rows1).toEqual(rows2)
    })
})
