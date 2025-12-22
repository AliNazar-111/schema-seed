import { describe, it, expect } from 'vitest'
import { createSeedPlan } from '../planner/plan.js'
import { SchemaGraph, NormalizedSqlType } from '../types.js'

describe('planner', () => {
    const schema: SchemaGraph = {
        tables: {
            users: {
                name: 'users',
                columns: {
                    id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: true },
                    profile_id: { name: 'profile_id', type: NormalizedSqlType.INT, rawType: 'int', nullable: true, isAutoIncrement: false },
                },
                foreignKeys: [
                    { columns: ['profile_id'], referencedTable: 'profiles', referencedColumns: ['id'] }
                ],
                uniqueConstraints: []
            },
            profiles: {
                name: 'profiles',
                columns: {
                    id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: true },
                    user_id: { name: 'user_id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: false },
                },
                foreignKeys: [
                    { columns: ['user_id'], referencedTable: 'users', referencedColumns: ['id'] }
                ],
                uniqueConstraints: []
            },
            posts: {
                name: 'posts',
                columns: {
                    id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: true },
                    author_id: { name: 'author_id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: false },
                },
                foreignKeys: [
                    { columns: ['author_id'], referencedTable: 'users', referencedColumns: ['id'] }
                ],
                uniqueConstraints: []
            }
        }
    }

    it('should detect and resolve cycles with nullable FKs', () => {
        const plan = createSeedPlan(schema, {})
        expect(plan.insertOrder).toBeDefined()
        // In a cycle users <-> profiles, if users.profile_id is nullable, 
        // it can be broken. Toposort might put profiles first.
        expect(plan.insertOrder).toContain('users')
        expect(plan.insertOrder).toContain('profiles')
        expect(plan.insertOrder).toContain('posts')
    })

    it('should throw on unresolvable cycles', () => {
        const unresolvableSchema: SchemaGraph = {
            tables: {
                a: {
                    name: 'a',
                    columns: { id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: true }, b_id: { name: 'b_id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: false } },
                    foreignKeys: [{ columns: ['b_id'], referencedTable: 'b', referencedColumns: ['id'] }],
                    uniqueConstraints: []
                },
                b: {
                    name: 'b',
                    columns: { id: { name: 'id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: true }, a_id: { name: 'a_id', type: NormalizedSqlType.INT, rawType: 'int', nullable: false, isAutoIncrement: false } },
                    foreignKeys: [{ columns: ['a_id'], referencedTable: 'a', referencedColumns: ['id'] }],
                    uniqueConstraints: []
                }
            }
        }

        expect(() => createSeedPlan(unresolvableSchema, {})).toThrow(/Unresolvable cycles detected/)
    })

    it('should handle --with-parents correctly', () => {
        const plan = createSeedPlan(schema, { includeTables: ['posts'], withParents: true })
        // posts depends on users, users depends on profiles, profiles depends on users (cycle)
        // But for posts, it needs users and profiles.
        expect(plan.insertOrder).toContain('posts')
        expect(plan.insertOrder).toContain('users')
        expect(plan.insertOrder).toContain('profiles')
    })

    it('should handle simple includeTables without parents', () => {
        const plan = createSeedPlan(schema, { includeTables: ['posts'], withParents: false })
        expect(plan.insertOrder).toEqual(['posts'])
    })
})
