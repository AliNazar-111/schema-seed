#!/usr/bin/env node
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
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'

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
            // Try to resolve from the current working directory first
            const localPath = resolve(process.cwd(), 'node_modules', name)
            return await import(localPath)
        } catch {
            try {
                // Fallback to standard import
                return await import(name)
            } catch {
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
            const mergedOptions = { ...config, ...options }

            // Handle rows default (commander default was overriding config)
            if (options.rows === undefined && config.rows === undefined) {
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
                    allowProduction: mergedOptions.allowProduction
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
