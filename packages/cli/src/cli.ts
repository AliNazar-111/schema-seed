#!/usr/bin/env node
import { Command } from 'commander'
import {
    version,
    runSeedSql,
    runSeedMongo,
    createSeedPlan,
    reportToConsole,
    reportToJson
} from '@schema-seed/core'
import { generators, inferGenerator } from '@schema-seed/generators'
import { loadConfig } from './config.mjs'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'

const program = new Command()

program
    .name('schema-seed')
    .description('CLI to seed your database with realistic data')
    .version(version)

async function getAdapter(dbType: string, dbUrl: string) {
    const packageName = `@schema-seed/adapter-${dbType}`
    try {
        const module = await import(packageName)
        const adapterName = dbType.charAt(0).toUpperCase() + dbType.slice(1) + 'Adapter'
        const AdapterClass = module[adapterName] || module.Adapter || module.default

        if (!AdapterClass) {
            // Try factory function
            const factoryMethod = `create${dbType.charAt(0).toUpperCase() + dbType.slice(1)}Adapter`
            if (typeof module[factoryMethod] === 'function') {
                return module[factoryMethod](dbUrl)
            }
            throw new Error(`Could not find adapter class or factory in ${packageName}`)
        }

        return new AdapterClass(dbUrl)
    } catch (err: any) {
        if (err.code === 'ERR_MODULE_NOT_FOUND' || err.message.includes('Cannot find module')) {
            throw new Error(`Adapter package ${packageName} not found. Please install it: npm install ${packageName}`)
        }
        throw new Error(`Failed to load adapter ${packageName}: ${err.message}`)
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
        .option('--all', 'Seed all tables', true)
        .option('--rows <number>', 'Number of rows per table', (v) => parseInt(v), 10)
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
        const config = await loadConfig(options.config)
        const mergedOptions = { ...config, ...options }

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

        const dbUrl = mergedOptions.db
        if (!dbUrl) {
            console.error('Error: Database connection string (--db) is required')
            process.exit(1)
        }

        const dbType = mergedOptions.dbType || inferDbType(dbUrl)

        try {
            const adapter = await getAdapter(dbType, dbUrl)
            await adapter.connect()

            let report;
            if (dbType === 'mongodb') {
                // For MongoDB, we either use the provided config schema or try to introspect
                const collections = await (adapter as any).introspectCollections()
                const mongoSchema = (mergedOptions as any).mongoSchema || { collections: {} }

                // Merge introspected collections into schema if not present
                for (const coll of collections) {
                    if (!mongoSchema.collections[coll]) {
                        mongoSchema.collections[coll] = { name: coll, fields: {} }
                    }
                }

                report = await runSeedMongo(adapter as any, mongoSchema, mergedOptions, {
                    generators,
                    inferGenerator,
                    overrides: mergedOptions.overrides
                })
            } else {
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
        console.log('Resetting database...')
        // Implementation would call adapter.truncateTables()
    })

program.command('introspect')
    .description('Introspect the database schema and print as JSON')
    .option('--db <url>', 'Database connection string')
    .action(async (options) => {
        console.log('Introspecting database...')
        // Implementation would call adapter.introspectSchema()
    })

program.parse()
