import { createJiti } from 'jiti'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { type SeedOptions } from 'schema-seed-core'
import { type MongoSeedConfig } from 'schema-seed-core/mongo'

export type Config = (SeedOptions & {
    db?: string
    dbType?: string
    overrides?: Record<string, any>
}) | MongoSeedConfig

export async function loadConfig(configPath?: string): Promise<Config> {
    const jiti = createJiti(import.meta.url)

    if (configPath) {
        const fullPath = resolve(process.cwd(), configPath)
        if (!existsSync(fullPath)) {
            throw new Error(`Config file not found at ${fullPath}`)
        }
        const module = await jiti.import(fullPath) as any
        console.log(`✅ Loaded config from ${configPath}`)
        return module.default || module
    }

    const defaultPaths = [
        resolve(process.cwd(), 'seed.config.ts'),
        resolve(process.cwd(), 'seed.config.js'),
        resolve(process.cwd(), 'seed.config.mjs'),
    ]

    for (const path of defaultPaths) {
        if (existsSync(path)) {
            try {
                const module = await jiti.import(path) as any
                console.log(`✅ Loaded config from ${path}`)
                return module.default || module
            } catch (err: any) {
                throw new Error(`Failed to load config file ${path}: ${err.message}`)
            }
        }
    }

    return {}
}
