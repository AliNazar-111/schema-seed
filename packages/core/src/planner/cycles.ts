import { SchemaGraph, TableSchema } from '../types.js'
import { DependencyGraph } from './graph.js'

export interface CycleResolution {
    resolved: boolean
    strategy?: 'NULLABLE_FK' | 'DEFERRABLE'
    breakingTable?: string
    breakingColumn?: string
}

/**
 * Attempts to resolve cycles in the dependency graph.
 */
export function resolveCycles(
    cycles: string[][],
    schema: SchemaGraph,
    supportsDeferrable: boolean
): CycleResolution[] {
    return cycles.map((cycle) => {
        // Strategy B: Deferrable constraints
        if (supportsDeferrable) {
            return { resolved: true, strategy: 'DEFERRABLE' }
        }

        // Strategy A: Nullable FK
        // Look for a table in the cycle that has a nullable foreign key pointing to another table in the cycle
        for (let i = 0; i < cycle.length; i++) {
            const currentTable = cycle[i]
            const nextTable = cycle[(i + 1) % cycle.length]
            const tableSchema = schema.tables[currentTable]

            const nullableFk = tableSchema.foreignKeys.find((fk) => {
                if (fk.referencedTable !== nextTable) return false
                // Check if all columns in this FK are nullable
                return fk.columns.every((colName) => tableSchema.columns[colName]?.nullable)
            })

            if (nullableFk) {
                return {
                    resolved: true,
                    strategy: 'NULLABLE_FK',
                    breakingTable: currentTable,
                    breakingColumn: nullableFk.columns[0], // Simplified: just track one
                }
            }
        }

        return { resolved: false }
    })
}
