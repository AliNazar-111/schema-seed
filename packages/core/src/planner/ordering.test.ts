import { describe, it, expect } from 'vitest'
import { createSeedPlan } from './plan.js'
import { SchemaGraph, NormalizedSqlType } from '../types.js'

describe('Planner Ordering', () => {
    it('should order tables correctly based on foreign keys', () => {
        const schema: SchemaGraph = {
            tables: {
                comments: {
                    name: 'comments',
                    columns: { post_id: { name: 'post_id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: false } },
                    foreignKeys: [{ columns: ['post_id'], referencedTable: 'posts', referencedColumns: ['id'] }],
                    uniqueConstraints: []
                },
                posts: {
                    name: 'posts',
                    columns: { author_id: { name: 'author_id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: false } },
                    foreignKeys: [{ columns: ['author_id'], referencedTable: 'users', referencedColumns: ['id'] }],
                    uniqueConstraints: []
                },
                users: {
                    name: 'users',
                    columns: { id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: true } },
                    foreignKeys: [],
                    uniqueConstraints: []
                }
            }
        }

        const plan = createSeedPlan(schema, {})
        const order = plan.insertOrder

        expect(order.indexOf('users')).toBeLessThan(order.indexOf('posts'))
        expect(order.indexOf('posts')).toBeLessThan(order.indexOf('comments'))
    })
})
