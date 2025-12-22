import { SeedOptions, TableOverrides } from './types.js'

export function validateOptions(options: SeedOptions): void {
    if (options.overrides) {
        for (const [tableName, tableOverrides] of Object.entries(options.overrides)) {
            if (typeof tableOverrides !== 'object' || tableOverrides === null) {
                throw new Error(`Invalid override for table "${tableName}": must be an object.`)
            }

            for (const [columnName, override] of Object.entries(tableOverrides)) {
                validateOverride(tableName, columnName, override)
            }
        }
    }
}

function validateOverride(table: string, column: string, override: any): void {
    if (typeof override === 'function') return

    if (typeof override === 'object' && override !== null) {
        if ('enum' in override) {
            if (!Array.isArray(override.enum)) {
                throw new Error(`Invalid enum override for "${table}.${column}": "enum" must be an array.`)
            }
            if (override.weights && (!Array.isArray(override.weights) || override.weights.length !== override.enum.length)) {
                throw new Error(`Invalid weights for "${table}.${column}": "weights" must be an array of the same length as "enum".`)
            }
            return
        }

        if ('dateBetween' in override) {
            if (!Array.isArray(override.dateBetween) || override.dateBetween.length !== 2) {
                throw new Error(`Invalid dateBetween override for "${table}.${column}": must be an array of [start, end].`)
            }
            return
        }
    }

    // Literal values are always valid
}
