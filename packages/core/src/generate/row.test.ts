import { describe, it, expect } from 'vitest'
import { generateRow, ReferenceRegistry, Random, UniquenessRegistry, NormalizedSqlType } from '../index.js'

describe('row generation', () => {
    const table = {
        name: 'posts',
        columns: {
            id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: true },
            title: { name: 'title', type: NormalizedSqlType.STRING, rawType: 'varchar', nullable: false, isAutoIncrement: false },
            author_id: { name: 'author_id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: false },
        },
        foreignKeys: [
            { columns: ['author_id'], referencedTable: 'users', referencedColumns: ['id'] }
        ],
        uniqueConstraints: []
    }

    it('should pick valid parent IDs from ReferenceRegistry', async () => {
        const random = new Random('seed')
        const uniqueness = new UniquenessRegistry()
        const refs = new ReferenceRegistry()

        // Add mock parent IDs
        refs.addReference('users', 101)
        refs.addReference('users', 102)

        const context = {
            random,
            uniqueness,
            refs,
            generators: {
                text: () => 'Hello World'
            },
            inferGenerator: () => ({ generatorId: 'text' })
        }

        const row = await generateRow(table, context as any)

        expect(row.author_id).toBeDefined()
        expect([101, 102]).toContain(row.author_id)
        expect(row.title).toBe('Hello World')
    })

    it('should respect uniqueness constraints', async () => {
        const tableWithUnique = {
            ...table,
            uniqueConstraints: [{ columns: ['title'] }]
        }

        const random = new Random('seed')
        const uniqueness = new UniquenessRegistry()
        const refs = new ReferenceRegistry()

        let count = 0
        const context = {
            random,
            uniqueness,
            refs,
            generators: {
                uniqueGen: () => {
                    count++
                    return count <= 2 ? 'same' : `different-${count}`
                }
            },
            inferGenerator: () => ({ generatorId: 'uniqueGen' })
        }

        const row1 = await generateRow(tableWithUnique, context as any)
        const row2 = await generateRow(tableWithUnique, context as any)

        expect(row1.title).toBe('same')
        expect(row2.title).toBe('different-3')
    })
})
