import 'dotenv/config'
import { Command } from 'commander'
import {
    version,
    runSeedSql,
    runSeedMongo,
    createSeedPlan,
    reportToConsole,
    reportToJson
} from 'schema-seed-core'
import { generators, inferGenerator } from 'schema-seed-generators'
import { loadConfig } from './config.mjs'
import { writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const program = new Command()

program
    .name('schema-seed')
    .description('CLI to seed your database with realistic data')
    .version(version)

async function getAdapter(dbType: string, dbUrl: string) {
    const unscopedName = `schema-seed-adapter-${dbType}`
    const scopedName = `@alinazar-111/schema-seed-adapter-${dbType}`

    const tryImport = async (name: string) => {
        try {
            const cwd = process.cwd()
            // Use createRequire to resolve the package from the current working directory
            const require = createRequire(resolve(cwd, 'index.js'))
            const packagePath = require.resolve(name)
            const url = pathToFileURL(packagePath).href
            return await import(url)
        } catch (err: any) {
            try {
                // Fallback to standard import (for globally installed adapters)
                return await import(name)
            } catch (err2: any) {
                return null
            }
        }
    }

    const module = (await tryImport(unscopedName)) || (await tryImport(scopedName))

    if (!module) {
        const installCmd = existsSync(resolve(process.cwd(), 'pnpm-lock.yaml'))
            ? `pnpm add ${unscopedName}`
            : `npm install ${unscopedName}`
        throw new Error(`Adapter package not found. Please install it: ${installCmd}`)
    }

    try {
        const adapterName = dbType.charAt(0).toUpperCase() + dbType.slice(1) + 'Adapter'
        const AdapterClass = module[adapterName] || module.Adapter || module.default

        if (!AdapterClass) {
            const factoryMethod = `create${dbType.charAt(0).toUpperCase() + dbType.slice(1)}Adapter`
            if (typeof module[factoryMethod] === 'function') {
                return module[factoryMethod](dbUrl)
            }
            throw new Error(`Could not find adapter class or factory in ${unscopedName}`)
        }

        return new AdapterClass(dbUrl)
    } catch (err: any) {
        throw new Error(`Failed to load adapter ${unscopedName}: ${err.message}`)
    }
}

function inferDbType(dbUrl: string): string {
    if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) return 'postgres'
    if (dbUrl.startsWith('mysql://')) return 'mysql'
    if (dbUrl.startsWith('sqlite://') || dbUrl.endsWith('.db')) return 'sqlite'
    if (dbUrl.startsWith('mongodb://')) return 'mongodb'
    if (dbUrl.startsWith('sqlserver://')) return 'mssql'
    return 'postgres' // Default
}

async function confirmAction(expected: string): Promise<boolean> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    })
    const answer = await rl.question(`⚠️  Type "${expected}" to confirm: `)
    rl.close()
    return answer === expected
}

const commonOptions = (cmd: Command) => {
    return cmd
        .option('--db <url>', 'Database connection string')
        .option('--dbType <type>', 'Database type (postgres, mysql, sqlite, mssql, oracle, mongodb)')
        .option('--config <path>', 'Path to config file')
        .option('--table <names...>', 'Specific tables to seed')
        .option('--all', 'Seed all tables')
        .option('--rows <number>', 'Number of rows per table', (v) => parseInt(v))
        .option('--rows-per-table <json>', 'JSON mapping of table names to row counts', (v) => JSON.parse(v))
        .option('--seed <string>', 'Random seed')
        .option('--dry-run', 'Do not execute any writes')
        .option('--truncate', 'Truncate tables before seeding')
        .option('--allow-production', 'Allow running against production databases')
        .option('--confirm <string>', 'Require typed confirmation string to proceed')
        .option('--with-parents', 'Include parent tables for foreign keys')
        .option('--out <path>', 'Output report to JSON file')
}

commonOptions(program.command('seed'))
    .description('Seed the database')
    .action(async (options) => {
        try {
            const config = await loadConfig(options.config)

            // Merge options: CLI flags override config file
            // Merge options: CLI flags override config file
            const cleanOptions = Object.fromEntries(
                Object.entries(options).filter(([_, v]) => v !== undefined)
            )
            const mergedOptions: any = { ...config, ...cleanOptions }

            // Handle rows default (commander default was overriding config)
            if (options.rows === undefined && (config as any).rows === undefined) {
                mergedOptions.rows = 10
            }

            if (options.rowsPerTable) {
                mergedOptions.rows = options.rowsPerTable
            }

            if (mergedOptions.confirm && !mergedOptions.dryRun) {
                const confirmed = await confirmAction(mergedOptions.confirm)
                if (!confirmed) {
                    console.error('❌ Confirmation failed. Aborting.')
                    process.exit(1)
                }
            }

            let dbUrl = mergedOptions.db
            if (mergedOptions.dbType === 'mongodb' && mergedOptions.mongodb?.uri) {
                dbUrl = mergedOptions.mongodb.uri
            }

            if (!dbUrl) {
                console.error('❌ Error: Database connection string is required.')
                console.error('   Provide it via --db flag or in your seed.config.ts file.')
                if (Object.keys(config).length === 0) {
                    console.error('   (No config file was found in the current directory)')
                }
                process.exit(1)
            }

            const dbType = mergedOptions.dbType || inferDbType(dbUrl)
            const adapter = await getAdapter(dbType, dbUrl)

            let report;
            if (dbType === 'mongodb') {
                report = await runSeedMongo(adapter as any, mergedOptions as any, {
                    dryRun: mergedOptions.dryRun,
                    allowProduction: mergedOptions.allowProduction,
                    truncate: mergedOptions.truncate
                }, { generators, inferGenerator })
            } else {
                await adapter.connect()
                const schema = await (adapter as any).introspectSchema()
                const plan = createSeedPlan(schema, mergedOptions, (adapter as any).capabilities?.deferrableConstraints)

                report = await runSeedSql(adapter as any, schema, plan, mergedOptions, {
                    generators,
                    inferGenerator,
                    overrides: mergedOptions.overrides
                })
            }

            reportToConsole(report)

            if (options.out) {
                writeFileSync(resolve(process.cwd(), options.out), reportToJson(report))
            }
        } catch (err: any) {
            console.error(`\n❌ Error: ${err.message}`)
            process.exit(1)
        }
    })

program.command('preview')
    .description('Preview the seeding plan without executing')
    .action(async (options) => {
        // Same as seed --dry-run
        const seedCmd = program.commands.find(c => c.name() === 'seed')
        await seedCmd?.parseAsync(['--dry-run', ...process.argv.slice(3)], { from: 'user' })
    })

program.command('reset')
    .description('Truncate all tables')
    .option('--db <url>', 'Database connection string')
    .option('--allow-production', 'Allow running against production databases')
    .action(async (options) => {
        try {
            const config = await loadConfig()
            const mergedOptions = { ...config, ...options }

            let dbUrl = mergedOptions.db
            if (mergedOptions.dbType === 'mongodb' && mergedOptions.mongodb?.uri) {
                dbUrl = mergedOptions.mongodb.uri
            }

            if (!dbUrl) {
                console.error('❌ Error: Database connection string is required.')
                process.exit(1)
            }

            const dbType = mergedOptions.dbType || inferDbType(dbUrl)
            const adapter = await getAdapter(dbType, dbUrl)

            if (mergedOptions.allowProduction !== true) {
                // Basic production check
                const prodKeywords = ['prod', 'production', 'live', 'cloud', 'aws', 'azure', 'gcp']
                if (prodKeywords.some(kw => dbUrl.toLowerCase().includes(kw))) {
                    console.error('❌ Error: Refusing to reset a potential production database.')
                    console.error('   Use --allow-production to override.')
                    process.exit(1)
                }
            }

            await adapter.connect()

            if (dbType === 'mongodb') {
                const mongoAdapter = adapter as any
                let collections: string[] = []

                if (mergedOptions.mongodb?.collections) {
                    collections = Object.keys(mergedOptions.mongodb.collections)
                } else if (mongoAdapter.introspectCollections) {
                    const introspected = await mongoAdapter.introspectCollections()
                    collections = introspected.map((c: any) => c.name)
                }

                if (collections.length === 0) {
                    console.warn('⚠️  No collections found to reset.')
                } else {
                    console.log(`🗑️  Resetting ${collections.length} collections...`)
                    if (mongoAdapter.truncateCollections) {
                        await mongoAdapter.truncateCollections(collections)
                        console.log('✅ Database reset complete.')
                    } else {
                        console.error('❌ Error: Adapter does not support truncation.')
                    }
                }
            } else {
                const sqlAdapter = adapter as any
                console.log('🔍 Introspecting database...')
                const schema = await sqlAdapter.introspectSchema()
                const tableNames = Object.keys(schema.tables)

                if (tableNames.length === 0) {
                    console.warn('⚠️  No tables found to reset.')
                } else {
                    console.log(`🗑️  Resetting ${tableNames.length} tables...`)
                    await sqlAdapter.truncateTables(tableNames)
                    console.log('✅ Database reset complete.')
                }
            }

            await adapter.disconnect()
        } catch (err: any) {
            console.error(`\n❌ Error: ${err.message}`)
            process.exit(1)
        }
    })

program.command('introspect')
    .description('Introspect the database schema and print as JSON')
    .option('--db <url>', 'Database connection string')
    .action(async (options) => {
        try {
            const config = await loadConfig()
            const mergedOptions = { ...config, ...options }

            let dbUrl = mergedOptions.db
            if (mergedOptions.dbType === 'mongodb' && mergedOptions.mongodb?.uri) {
                dbUrl = mergedOptions.mongodb.uri
            }

            if (!dbUrl) {
                console.error('❌ Error: Database connection string is required.')
                process.exit(1)
            }

            const dbType = mergedOptions.dbType || inferDbType(dbUrl)
            const adapter = await getAdapter(dbType, dbUrl)

            await adapter.connect()

            if (dbType === 'mongodb') {
                console.error('❌ Introspection not yet supported for MongoDB CLI output.')
            } else {
                const schema = await (adapter as any).introspectSchema()
                console.log(JSON.stringify(schema, null, 2))
            }

            await adapter.disconnect()
        } catch (err: any) {
            console.error(`\n❌ Error: ${err.message}`)
            process.exit(1)
        }
    })

program.parse()
