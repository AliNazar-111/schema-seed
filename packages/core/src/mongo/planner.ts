import { MongoSeedConfig } from './types.js'

export function createMongoPlan(config: MongoSeedConfig): string[] {
    const collections = Object.keys(config.mongodb.collections)
    const adj = new Map<string, string[]>()

    for (const [name, coll] of Object.entries(config.mongodb.collections)) {
        const deps: string[] = []
        for (const field of Object.values(coll.fields)) {
            if (typeof field === 'object' && field.ref) {
                const [refColl] = field.ref.split('.')
                if (!config.mongodb.collections[refColl]) {
                    throw new Error(`Reference ${field.ref} not found. Ensure ${refColl} collection is defined in config.`)
                }
                if (refColl !== name) {
                    deps.push(refColl)
                }
            }
        }
        adj.set(name, deps)
    }

    const visited = new Set<string>()
    const visiting = new Set<string>()
    const order: string[] = []

    function visit(name: string) {
        if (visiting.has(name)) {
            throw new Error(`Circular reference detected involving collection: ${name}`)
        }
        if (visited.has(name)) return

        visiting.add(name)
        for (const dep of adj.get(name) || []) {
            visit(dep)
        }
        visiting.delete(name)
        visited.add(name)
        order.push(name)
    }

    for (const name of collections) {
        visit(name)
    }

    return order
}
