import { TableSchema, ColumnSchema, NormalizedSqlType } from '../types.js'
import { Random } from '../random.js'
import { UniquenessRegistry } from '../uniqueness.js'
import { ReferenceRegistry } from './refs.js'

export interface GenerationContext {
    random: Random
    uniqueness: UniquenessRegistry
    refs: ReferenceRegistry
    /** Current row index in the batch */
    i: number
    /** Map of column name or table.column to a specific generator function */
    overrides?: Record<string, any>
    /** Map of generator IDs to their implementation */
    generators: Record<string, (ctx: any) => any>
    /** Function to infer generator ID from column metadata */
    inferGenerator: (columnName: string, sqlType: NormalizedSqlType) => { generatorId: string; options?: any }
}

/**
 * Generates multiple rows for a table.
 */
export async function generateRows(
    table: TableSchema,
    count: number,
    context: Omit<GenerationContext, 'i'>
): Promise<Record<string, any>[]> {
    const rows: Record<string, any>[] = []
    for (let i = 0; i < count; i++) {
        rows.push(await generateRow(table, { ...context, i } as GenerationContext))
    }
    return rows
}

/**
 * Generates a single row for a table.
 */
export async function generateRow(
    table: TableSchema,
    context: GenerationContext
): Promise<Record<string, any>> {
    const row: Record<string, any> = {}

    for (const column of Object.values(table.columns)) {
        // Skip auto-increment columns as they are handled by the DB
        if (column.isAutoIncrement) continue

        // Check for foreign keys
        const fk = table.foreignKeys.find((f) => f.columns.includes(column.name))
        if (fk) {
            const ref = context.refs.getRandomReference(fk.referencedTable, context.random)
            if (ref !== null) {
                // If it's a composite FK, we might need more complex logic. 
                // For now, assume single column FK.
                row[column.name] = ref
                continue
            }
        }

        // Check for overrides
        const tableOverride = context.overrides?.[table.name]?.[column.name]
        const globalOverride = context.overrides?.[column.name]
        const override = tableOverride !== undefined ? tableOverride : globalOverride

        if (override !== undefined) {
            if (typeof override === 'function') {
                row[column.name] = await override({ i: context.i, random: context.random, refs: context.refs })
                continue
            } else if (typeof override === 'object' && override !== null) {
                if ('enum' in override) {
                    const values = override.enum
                    const weights = override.weights
                    row[column.name] = context.random.pick(values, weights)
                    continue
                } else if ('dateBetween' in override) {
                    const [start, end] = override.dateBetween
                    const startTime = new Date(start).getTime()
                    const endTime = new Date(end).getTime()
                    const randomTime = context.random.nextInt(startTime, endTime)
                    row[column.name] = new Date(randomTime).toISOString()
                    continue
                }
            }
            // Literal value override
            row[column.name] = override
            continue
        }

        // Use semantic inference
        const { generatorId, options } = context.inferGenerator(column.name, column.type)
        const generator = context.generators[generatorId]

        if (generator) {
            // Wrap in uniqueness check if needed (e.g. if column is in uniqueConstraints)
            const isUnique = table.uniqueConstraints.some((uc) => uc.columns.includes(column.name)) ||
                table.primaryKey?.columns.includes(column.name)

            if (isUnique) {
                row[column.name] = await context.uniqueness.ensureUnique(
                    table.name,
                    column.name,
                    () => generator({ ...context, options })
                )
            } else {
                row[column.name] = generator({ ...context, options })
            }
        } else {
            // Fallback to basic type-based generation if no generator found
            row[column.name] = generateDefaultValue(column, context.random)
        }
    }

    return row
}

function generateDefaultValue(column: ColumnSchema, random: Random): any {
    if (column.defaultValue !== undefined) return column.defaultValue
    if (column.nullable && random.boolean(0.1)) return null

    switch (column.type) {
        case NormalizedSqlType.INT:
        case NormalizedSqlType.BIGINT:
            return random.nextInt(1, 1000)
        case NormalizedSqlType.FLOAT:
        case NormalizedSqlType.DECIMAL:
            return parseFloat((random.next() * 100).toFixed(2))
        case NormalizedSqlType.BOOLEAN:
            return random.boolean()
        case NormalizedSqlType.DATE:
        case NormalizedSqlType.DATETIME:
            return new Date().toISOString()
        case NormalizedSqlType.JSON:
            return { mock: 'data' }
        case NormalizedSqlType.ENUM:
            return column.enumValues ? random.pick(column.enumValues) : 'VALUE'
        default:
            return 'mock-string'
    }
}
