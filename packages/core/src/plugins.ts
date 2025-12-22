import { Plugin, SeedOptions, RunnerContext } from './types.js'

export async function loadPlugins(options: SeedOptions, context: RunnerContext): Promise<void> {
    if (!options.plugins) return

    for (const pluginRef of options.plugins) {
        let plugin: Plugin
        if (typeof pluginRef === 'string') {
            try {
                // In a real scenario, we'd use dynamic import or a registry
                // For now, we'll assume it's already available or throw a helpful error
                const module = await import(pluginRef)
                plugin = module.default || module
            } catch (err: any) {
                throw new Error(`Failed to load plugin ${pluginRef}: ${err.message}`)
            }
        } else {
            plugin = pluginRef
        }

        // Merge plugin contributions
        if (plugin.generators) {
            context.generators = { ...context.generators, ...plugin.generators }
        }

        if (plugin.overrides) {
            options.overrides = mergeOverrides(options.overrides || {}, plugin.overrides)
        }

        if (plugin.hooks) {
            options.hooks = mergeHooks(options.hooks || {}, plugin.hooks)
        }
    }
}

function mergeOverrides(base: Record<string, any>, plugin: Record<string, any>): Record<string, any> {
    const merged = { ...base }
    for (const [table, tableOverrides] of Object.entries(plugin)) {
        merged[table] = { ...(merged[table] || {}), ...tableOverrides }
    }
    return merged
}

function mergeHooks(base: any, plugin: any): any {
    return {
        beforeInsert: async (table: string, rows: any[]) => {
            let currentRows = rows
            if (base.beforeInsert) currentRows = await base.beforeInsert(table, currentRows)
            if (plugin.beforeInsert) currentRows = await plugin.beforeInsert(table, currentRows)
            return currentRows
        },
        afterInsert: async (table: string, result: any) => {
            if (base.afterInsert) await base.afterInsert(table, result)
            if (plugin.afterInsert) await plugin.afterInsert(table, result)
        }
    }
}
