import { describe, it, expect, vi } from 'vitest'
import { runSeedSql } from './runner.js'
import { SqlAdapter } from './adapter.js'
import { NormalizedSqlType } from './types.js'

class MockSqlAdapter implements SqlAdapter {
    connect = vi.fn().mockResolvedValue(undefined)
    disconnect = vi.fn().mockResolvedValue(undefined)
    begin = vi.fn().mockResolvedValue(undefined)
    commit = vi.fn().mockResolvedValue(undefined)
    rollback = vi.fn().mockResolvedValue(undefined)
    introspectSchema = vi.fn()
    insertBatch = vi.fn().mockResolvedValue(undefined)
    truncateTables = vi.fn().mockResolvedValue(undefined)
    capabilities = {
        enums: true,
        deferrableConstraints: true,
        returning: true,
        identityInsert: false
    }
}

describe('runner', () => {
    const schema = {
        tables: {
            users: {
                name: 'users',
                columns: {
                    id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: false },
                    name: { name: 'name', type: NormalizedSqlType.STRING, rawType: 'varchar', nullable: false, isAutoIncrement: false },
                },
                primaryKey: { columns: ['id'] },
                foreignKeys: [],
                uniqueConstraints: []
            }
        }
    }

    const plan = {
        insertOrder: ['users'],
        batches: [],
        referencesMap: new Map()
    }

    const context = {
        generators: {
            id: () => 1,
            text: () => 'Test'
        },
        inferGenerator: (name: string) => name === 'id' ? { generatorId: 'id' } : { generatorId: 'text' }
    }

    it('should execute seeding successfully', async () => {
        const adapter = new MockSqlAdapter()
        const options = { seed: 'test', rows: 5 }

        const report = await runSeedSql(adapter, schema, plan, options, context as any)

        expect(report.success).toBe(true)
        expect(report.tables.users.insertedCount).toBe(5)
        expect(adapter.connect).toHaveBeenCalled()
        expect(adapter.insertBatch).toHaveBeenCalled()
        expect(adapter.commit).toHaveBeenCalled()
        expect(adapter.disconnect).toHaveBeenCalled()
    })

    it('should respect dryRun option', async () => {
        const adapter = new MockSqlAdapter()
        const options = { seed: 'test', rows: 5, dryRun: true }

        const report = await runSeedSql(adapter, schema, plan, options, context as any)

        expect(report.success).toBe(true)
        expect(adapter.begin).not.toHaveBeenCalled()
        expect(adapter.insertBatch).not.toHaveBeenCalled()
    })

    it('should handle errors and rollback', async () => {
        const adapter = new MockSqlAdapter()
        adapter.insertBatch.mockRejectedValue(new Error('DB Error'))
        const options = { seed: 'test', rows: 5 }

        const report = await runSeedSql(adapter, schema, plan, options, context as any)

        expect(report.success).toBe(false)
        expect(adapter.rollback).toHaveBeenCalled()
        expect(adapter.disconnect).toHaveBeenCalled()
    })
})
