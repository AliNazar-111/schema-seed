import { SchemaGraph } from '../types.js'

export interface DependencyNode {
    tableName: string
    dependencies: Set<string> // Tables this table depends on
    dependents: Set<string>   // Tables that depend on this table
}

export class DependencyGraph {
    nodes: Map<string, DependencyNode> = new Map()

    constructor(schema: SchemaGraph) {
        // Initialize nodes
        for (const tableName of Object.keys(schema.tables)) {
            this.nodes.set(tableName, {
                tableName,
                dependencies: new Set(),
                dependents: new Set(),
            })
        }

        // Build edges from foreign keys
        for (const [tableName, table] of Object.entries(schema.tables)) {
            const node = this.nodes.get(tableName)!
            for (const fk of table.foreignKeys) {
                // Self-references are handled during cycle detection/resolution
                if (fk.referencedTable === tableName) continue

                if (this.nodes.has(fk.referencedTable)) {
                    node.dependencies.add(fk.referencedTable)
                    this.nodes.get(fk.referencedTable)!.dependents.add(tableName)
                }
            }
        }
    }

    getNodes() {
        return Array.from(this.nodes.values())
    }

    getNode(tableName: string) {
        return this.nodes.get(tableName)
    }
}
