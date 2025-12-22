import { SqlAdapter, MongoAdapter } from './adapter.js'
import { SeedPlan, SeedOptions, EffectReport, TableSchema, MongoSchema, RunnerContext } from './types.js'
import { Random } from './random.js'
import { UniquenessRegistry } from './uniqueness.js'
import { ReferenceRegistry } from './generate/refs.js'
import { generateRows } from './generate/row.js'
import { Redactor } from './redaction.js'
import { loadPlugins } from './plugins.js'
import { validateOptions } from './validation.js'

function checkProductionSafety(options: SeedOptions, dbUrl?: string) {
    if (options.allowProduction) return

    if (process.env.NODE_ENV === 'production') {
        throw new Error('Refusing to run in production environment (NODE_ENV=production). Use --allow-production to override.')
    }

    if (dbUrl) {
        const prodKeywords = ['prod', 'production', 'live', 'cloud', 'aws', 'azure', 'gcp']
        try {
            const url = new URL(dbUrl.includes('://') ? dbUrl : `sqlite://${dbUrl}`)
            const host = url.hostname.toLowerCase()
            if (prodKeywords.some(kw => host.includes(kw))) {
                throw new Error(`Refusing to run against a potential production database (${host}). Use --allow-production to override.`)
            }
        } catch (e) {
            // If URL parsing fails, we fallback to simple string check
            const lowerUrl = dbUrl.toLowerCase()
            if (prodKeywords.some(kw => lowerUrl.includes(kw))) {
                throw new Error('Refusing to run against a potential production database. Use --allow-production to override.')
            }
        }
    }
}


export async function runSeedSql(
    adapter: SqlAdapter,
    schema: any, // SchemaGraph
    plan: SeedPlan,
    options: SeedOptions,
    context: RunnerContext
): Promise<EffectReport> {
    const startTime = Date.now()
    const report: EffectReport = {
        success: true,
        durationMs: 0,
        tables: {},
        errors: [],
    }

    const random = new Random(options.seed || Date.now())
    const uniqueness = new UniquenessRegistry()
    const refs = new ReferenceRegistry()

    await loadPlugins(options, context)
    validateOptions(options)
    checkProductionSafety(options, (adapter as any).config?.connectionString || (adapter as any).config)

    try {
        await adapter.connect()

        if (options.truncate && plan.insertOrder.length > 0) {
            if (!options.allowProduction) {
                // Simple heuristic: check for common production indicators if needed
                // For now, we rely on the user's explicit flag
            }
            if (!options.dryRun) {
                await adapter.truncateTables([...plan.insertOrder].reverse())
            }
        }

        if (!options.dryRun) {
            await adapter.begin()
        }

        for (const tableName of plan.insertOrder) {
            const tableStartTime = Date.now()
            const tableSchema: TableSchema = schema.tables[tableName]
            const rowCount = typeof options.rows === 'number'
                ? options.rows
                : (options.rows?.[tableName] ?? 10)

            try {
                const genCtx = {
                    random,
                    uniqueness,
                    refs,
                    generators: context.generators,
                    inferGenerator: context.inferGenerator,
                    overrides: context.overrides,
                }

                let rows = await generateRows(tableSchema, rowCount, genCtx as any)

                if (!options.dryRun) {
                    if (options.hooks?.beforeInsert) {
                        rows = await options.hooks.beforeInsert(tableName, rows)
                    }

                    const batchSize = options.batchSize || 1000
                    for (let i = 0; i < rows.length; i += batchSize) {
                        const batch = rows.slice(i, i + batchSize)
                        await adapter.insertBatch({ tableName, rows: batch })
                    }

                    // Record PKs for future FK resolution
                    // This is a simplification: we assume the adapter might need to return IDs
                    // or we use the generated ones if they aren't auto-inc
                    for (const row of rows) {
                        if (tableSchema.primaryKey) {
                            // For simple single-column PKs
                            const pkCol = tableSchema.primaryKey.columns[0]
                            if (row[pkCol] !== undefined) {
                                refs.addReference(tableName, row[pkCol])
                            }
                        }
                    }
                }

                report.tables[tableName] = {
                    insertedCount: rows.length,
                    durationMs: Date.now() - tableStartTime,
                }

                if (!options.dryRun && options.hooks?.afterInsert) {
                    await options.hooks.afterInsert(tableName, report.tables[tableName])
                }
            } catch (err: any) {
                report.success = false
                report.tables[tableName] = {
                    insertedCount: 0,
                    durationMs: Date.now() - tableStartTime,
                    error: err.message,
                }
                report.errors.push(err)
                if (!options.dryRun) {
                    await adapter.rollback()
                    throw err
                }
            }
        }

        if (!options.dryRun) {
            await adapter.commit()
        }
    } catch (err: any) {
        report.success = false
        report.errors.push(err)
    } finally {
        await adapter.disconnect()
        report.durationMs = Date.now() - startTime
    }

    return report
}

export async function runSeedMongo(
    adapter: MongoAdapter,
    schema: MongoSchema,
    options: SeedOptions,
    context: RunnerContext
): Promise<EffectReport> {
    const startTime = Date.now()
    const report: EffectReport = {
        success: true,
        durationMs: 0,
        tables: {},
        errors: [],
    }

    const random = new Random(options.seed || Date.now())
    const uniqueness = new UniquenessRegistry()
    const refs = new ReferenceRegistry()

    await loadPlugins(options, context)
    validateOptions(options)
    checkProductionSafety(options, (adapter as any).uri)

    try {
        await adapter.connect()

        const collectionsToSeed = options.includeTables || Object.keys(schema.collections)

        if (options.truncate && collectionsToSeed.length > 0) {
            if (!options.dryRun && adapter.truncateCollections) {
                await adapter.truncateCollections(collectionsToSeed)
            }
        }

        for (const collName of collectionsToSeed) {
            const collStartTime = Date.now()
            const collSchema = schema.collections[collName]
            if (!collSchema) continue

            const rowCount = typeof options.rows === 'number'
                ? options.rows
                : (options.rows?.[collName] ?? 10)

            try {
                const genCtx = {
                    random,
                    uniqueness,
                    refs,
                    generators: context.generators,
                    inferGenerator: context.inferGenerator,
                    overrides: context.overrides,
                }

                // Map MongoCollectionSchema to TableSchema for generateRows
                const tableSchema: TableSchema = {
                    name: collName,
                    columns: collSchema.fields,
                    foreignKeys: Object.entries(collSchema.references || {}).map(([col, ref]) => {
                        const [refTable, refCol] = ref.split('.')
                        return { columns: [col], referencedTable: refTable, referencedColumns: [refCol] }
                    }),
                    uniqueConstraints: [],
                }

                let docs = await generateRows(tableSchema, rowCount, genCtx as any)

                if (!options.dryRun) {
                    if (options.hooks?.beforeInsert) {
                        docs = await options.hooks.beforeInsert(collName, docs)
                    }

                    await adapter.insertMany(collName, docs)

                    // Record IDs for future reference resolution
                    for (const doc of docs) {
                        if (doc._id) {
                            refs.addReference(collName, doc._id)
                        }
                    }
                }

                report.tables[collName] = {
                    insertedCount: docs.length,
                    durationMs: Date.now() - collStartTime,
                }

                if (!options.dryRun && options.hooks?.afterInsert) {
                    await options.hooks.afterInsert(collName, report.tables[collName])
                }
            } catch (err: any) {
                report.success = false
                report.tables[collName] = {
                    insertedCount: 0,
                    durationMs: Date.now() - collStartTime,
                    error: err.message,
                }
                report.errors.push(err)
            }
        }
    } catch (err: any) {
        report.success = false
        report.errors.push(err)
    } finally {
        await adapter.disconnect()
        report.durationMs = Date.now() - startTime
    }

    return report
}
