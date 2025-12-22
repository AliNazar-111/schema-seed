import { DependencyGraph } from './graph.js'

export interface TopoSortResult {
    order: string[]
    cycles: string[][]
}

/**
 * Performs a topological sort on the dependency graph.
 * Uses Kahn's algorithm or DFS-based approach. Here we use DFS for easier cycle path extraction.
 */
export function topologicalSort(graph: DependencyGraph): TopoSortResult {
    const order: string[] = []
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recStack = new Set<string>()
    const path: string[] = []

    function visit(tableName: string) {
        if (recStack.has(tableName)) {
            // Cycle detected
            const cycleStart = path.indexOf(tableName)
            cycles.push(path.slice(cycleStart))
            return
        }
        if (visited.has(tableName)) return

        visited.add(tableName)
        recStack.add(tableName)
        path.push(tableName)

        const node = graph.getNode(tableName)
        if (node) {
            for (const dep of node.dependencies) {
                visit(dep)
            }
        }

        recStack.delete(tableName)
        path.pop()
        order.push(tableName)
    }

    for (const node of graph.getNodes()) {
        if (!visited.has(node.tableName)) {
            visit(node.tableName)
        }
    }

    return { order, cycles }
}
