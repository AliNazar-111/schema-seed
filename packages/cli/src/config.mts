import { createJiti } from 'jiti'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { SeedOptions, MongoSeedConfig } from '@schema-seed/core'

export type Config = (SeedOptions & {
    db?: string
    dbType?: string
    overrides?: Record<string, any>
}) | MongoSeedConfig

export async function loadConfig(configPath?: string): Promise<Config> {
    const jiti = createJiti(import.meta.url)
    const paths = configPath
        ? [resolve(process.cwd(), configPath)]
        : [
            resolve(process.cwd(), 'seed.config.ts'),
            resolve(process.cwd(), 'seed.config.js'),
            resolve(process.cwd(), 'seed.config.mjs'),
        ]

    for (const path of paths) {
        if (existsSync(path)) {
            const module = await jiti.import(path) as any
            return module.default || module
        }
    }

    return {}
}
