import { Random } from '../random.js'

/**
 * Registry to store and retrieve primary key values for foreign key resolution.
 */
export class ReferenceRegistry {
    private refs: Map<string, any[]> = new Map()

    /**
     * Records an inserted primary key for a table.
     */
    addReference(table: string, pk: any) {
        if (!this.refs.has(table)) {
            this.refs.set(table, [])
        }
        this.refs.get(table)!.push(pk)
    }

    /**
     * Picks a random primary key from the specified table.
     */
    getRandomReference(table: string, random: Random): any {
        const tableRefs = this.refs.get(table)
        if (!tableRefs || tableRefs.length === 0) {
            return null
        }
        return random.pick(tableRefs)
    }

    /**
     * Returns all recorded references for a table.
     */
    getReferences(table: string): any[] {
        return this.refs.get(table) || []
    }

    clear() {
        this.refs.clear()
    }
}
