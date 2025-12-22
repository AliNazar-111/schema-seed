import { SchemaGraph, SeedPlan, SeedOptions, TableSchema } from '../types.js'
import { DependencyGraph } from './graph.js'
import { topologicalSort } from './toposort.js'
import { resolveCycles } from './cycles.js'

export function createSeedPlan(
    schema: SchemaGraph,
    options: SeedOptions,
    supportsDeferrable = false
): SeedPlan {
    const graph = new DependencyGraph(schema)
    const { order, cycles } = topologicalSort(graph)

    if (cycles.length > 0) {
        const resolutions = resolveCycles(cycles, schema, supportsDeferrable)
        const unresolvable = resolutions.filter((r) => !r.resolved)

        if (unresolvable.length > 0) {
            const cyclePaths = cycles
                .filter((_, i) => !resolutions[i].resolved)
                .map((c) => c.join(' -> '))
                .join('\n')
            throw new Error(
                `Unresolvable cycles detected in schema:\n${cyclePaths}\nTry making one of the foreign keys nullable or use a database that supports deferrable constraints.`
            )
        }
    }

    let finalOrder = order

    // Apply include/exclude filters
    if (options.includeTables) {
        const includeSet = new Set(options.includeTables)
        if (options.withParents) {
            // Expand includeSet to include all parents
            const expanded = new Set<string>()
            const walk = (tableName: string) => {
                if (expanded.has(tableName)) return
                expanded.add(tableName)
                const node = graph.getNode(tableName)
                if (node) {
                    for (const dep of node.dependencies) {
                        walk(dep)
                    }
                }
            }
            options.includeTables.forEach(walk)
            finalOrder = finalOrder.filter((t) => expanded.has(t))
        } else {
            finalOrder = finalOrder.filter((t) => includeSet.has(t))
        }
    }

    if (options.excludeTables) {
        const excludeSet = new Set(options.excludeTables)
        finalOrder = finalOrder.filter((t) => !excludeSet.has(t))
    }

    // Join table heuristics: tables with 2+ FKs and mostly FK columns
    // These should generally be seeded after their parents, which topological sort already handles.
    // But we can refine the order if needed. For now, toposort is sufficient.

    return {
        insertOrder: finalOrder,
        batches: [], // To be populated by the generator
        referencesMap: new Map(),
    }
}

/**
 * Heuristic to identify if a table is likely a join table.
 */
export function isJoinTable(table: TableSchema): boolean {
    const fkColumnCount = new Set(table.foreignKeys.flatMap((fk) => fk.columns)).size
    const totalColumnCount = Object.keys(table.columns).length

    return (
        table.foreignKeys.length >= 2 &&
        fkColumnCount >= totalColumnCount * 0.7 // 70% or more columns are FKs
    )
}
