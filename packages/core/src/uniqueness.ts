/**
 * Registry to track and enforce uniqueness for generated values.
 */
export class UniquenessRegistry {
    private registry: Map<string, Set<any>> = new Map()

    /**
     * Generates a unique key for a table and column.
     */
    private getRegistryKey(table: string, column: string): string {
        return `${table}.${column}`
    }

    /**
     * Attempts to generate a unique value using a generator function.
     * If the generated value is already in the registry, it retries up to `maxRetries` times.
     * If it still fails, it uses a deterministic fallback.
     * 
     * @param table Table name
     * @param column Column name
     * @param generator Function that generates a value
     * @param maxRetries Maximum number of retries before fallback
     * @returns A unique value
     */
    async ensureUnique<T>(
        table: string,
        column: string,
        generator: () => T | Promise<T>,
        maxRetries = 100
    ): Promise<T> {
        const key = this.getRegistryKey(table, column)
        if (!this.registry.has(key)) {
            this.registry.set(key, new Set())
        }
        const usedValues = this.registry.get(key)!

        for (let i = 0; i < maxRetries; i++) {
            const value = await generator()
            if (!usedValues.has(value)) {
                usedValues.add(value)
                return value
            }
        }

        // Deterministic fallback: append a counter or hash if retries fail
        const fallbackValue = await generator()
        const finalValue = `${fallbackValue}_${usedValues.size}` as unknown as T
        usedValues.add(finalValue)
        return finalValue
    }

    /**
     * Clears the registry for a specific table/column or all.
     */
    clear(table?: string, column?: string) {
        if (table && column) {
            this.registry.delete(this.getRegistryKey(table, column))
        } else {
            this.registry.clear()
        }
    }
}
