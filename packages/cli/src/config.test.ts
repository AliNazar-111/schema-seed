import { describe, it, expect, vi } from 'vitest'
import { loadConfig } from './config.mjs'

// Mock jiti and fs for config loading tests
vi.mock('jiti', () => ({
    createJiti: () => ({
        import: vi.fn().mockResolvedValue({ default: { rows: 20, db: 'postgres://config' } })
    })
}))

vi.mock('node:fs', () => ({
    existsSync: vi.fn().mockReturnValue(true)
}))

describe('CLI Config Merge', () => {
    it('should merge config file with CLI options', async () => {
        const config = await loadConfig('seed.config.ts')
        const cliOptions = { db: 'postgres://cli', table: ['users'] }

        const merged = { ...config, ...cliOptions }

        expect(merged.rows).toBe(20) // From config
        expect(merged.db).toBe('postgres://cli') // From CLI (overrides config)
        expect(merged.table).toEqual(['users']) // From CLI
    })
})
