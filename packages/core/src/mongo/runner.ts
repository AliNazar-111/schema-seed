import { MongoSeedConfig, MongoCollectionConfig } from './types.js'
import { createMongoPlan } from './planner.js'
import { generateMongoDocument } from './generator.js'
import { Random } from '../random.js'
import { ReferenceRegistry } from '../generate/refs.js'
import { EffectReport, RunnerContext } from '../types.js'
import { MongoAdapter } from '../adapter.js'

function checkProductionSafety(options: { allowProduction?: boolean }, dbUrl?: string) {
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
            const lowerUrl = dbUrl.toLowerCase()
            if (prodKeywords.some(kw => lowerUrl.includes(kw))) {
                throw new Error('Refusing to run against a potential production database. Use --allow-production to override.')
            }
        }
    }
}

export async function runSeedMongo(
    adapter: MongoAdapter,
    config: MongoSeedConfig,
    options: { dryRun?: boolean; allowProduction?: boolean } = {},
    context: RunnerContext
): Promise<EffectReport> {
    const startTime = Date.now()
    const report: EffectReport = {
        success: true,
        durationMs: 0,
        tables: {},
        errors: [],
    }

    const random = new Random(config.seed || Date.now())
    const refs = new ReferenceRegistry()

    checkProductionSafety(options, config.mongodb.uri)

    // Validations
    if (!config.mongodb?.collections || Object.keys(config.mongodb.collections).length === 0) {
        throw new Error('No collections defined in MongoDB config.')
    }

    for (const [name, coll] of Object.entries(config.mongodb.collections) as [string, MongoCollectionConfig][]) {
        if (coll.rows <= 0) {
            throw new Error(`Collection ${name} must have rows > 0.`)
        }
        if (!coll.fields || Object.keys(coll.fields).length === 0) {
            throw new Error(`Collection ${name} must have fields defined.`)
        }
        for (const [fieldName, field] of Object.entries(coll.fields)) {
            if (typeof field === 'object' && field !== null && 'type' in field && field.type === 'enum') {
                const enumField = field as any
                if (enumField.weights && enumField.values && enumField.weights.length !== enumField.values.length) {
                    throw new Error(`Enum weights and values length mismatch in ${name}.${fieldName}`)
                }
            }
        }
    }

    try {
        await adapter.connect()

        const plan = createMongoPlan(config)

        for (const collName of plan) {
            const collStartTime = Date.now()
            const collConfig = config.mongodb.collections[collName]
            const docs: any[] = []

            try {
                for (let i = 0; i < collConfig.rows; i++) {
                    const doc = generateMongoDocument(collConfig.fields, {
                        random,
                        refs,
                        generators: context.generators
                    })
                    docs.push(doc)
                }

                if (!options.dryRun) {
                    await adapter.insertMany(collName, docs)

                    // Store IDs for references
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
