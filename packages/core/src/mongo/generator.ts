import { Random } from '../random.js'
import { ReferenceRegistry } from '../generate/refs.js'
import { MongoFieldConfig, MongoFieldType } from './types.js'

export interface MongoGeneratorContext {
    random: Random
    refs: ReferenceRegistry
    generators: Record<string, (ctx: any) => any>
}

export function generateMongoDocument(
    fields: Record<string, MongoFieldConfig>,
    ctx: MongoGeneratorContext
): any {
    const doc: any = {}
    for (const [name, config] of Object.entries(fields)) {
        doc[name] = generateFieldValue(config, ctx)
    }
    return doc
}

function generateFieldValue(config: MongoFieldConfig, ctx: MongoGeneratorContext): any {
    if (typeof config === 'string') {
        return generateByType(config as MongoFieldType, {}, ctx)
    }

    const cfg = config as any

    if (cfg.ref) {
        const [refColl, refField] = cfg.ref.split('.')
        const val = ctx.refs.getRandomReference(refColl, ctx.random)
        if (val === null) {
            throw new Error(`Reference ${cfg.ref} not found. Ensure ${refColl} collection is seeded first.`)
        }
        return val
    }

    if (cfg.type === 'enum') {
        return ctx.random.pick(cfg.values || [], cfg.weights)
    }

    if (cfg.type === 'object') {
        return generateMongoDocument(cfg.fields || {}, ctx)
    }

    if (cfg.type === 'array') {
        const count = ctx.random.nextInt(cfg.minItems ?? 1, cfg.maxItems ?? 5)
        return Array.from({ length: count }, () => generateFieldValue(cfg.of!, ctx))
    }

    return generateByType(cfg.type!, cfg, ctx)
}

function generateByType(type: MongoFieldType, config: any, ctx: MongoGeneratorContext): any {
    switch (type) {
        case 'objectId':
            return generateObjectId(ctx.random)
        case 'int':
            return ctx.random.nextInt(config.min ?? 0, config.max ?? 1000000)
        case 'float':
        case 'decimal':
            return parseFloat((ctx.random.next() * ((config.max ?? 100) - (config.min ?? 0)) + (config.min ?? 0)).toFixed(2))
        case 'boolean':
            return ctx.random.boolean()
        case 'date':
            return new Date(ctx.random.nextInt(0, Date.now())).toISOString()
        case 'dateRecent':
            return ctx.generators.dateRecent(ctx)
        case 'dateBetween': {
            const from = new Date(config.from ?? '2020-01-01').getTime()
            const to = new Date(config.to ?? Date.now()).getTime()
            return new Date(ctx.random.nextInt(from, to)).toISOString()
        }
        case 'email':
            return ctx.generators.email(ctx)
        case 'firstName':
            return ctx.generators.firstName(ctx)
        case 'lastName':
            return ctx.generators.lastName(ctx)
        case 'fullName':
            return ctx.generators.fullName(ctx)
        case 'city':
            return ctx.generators.city(ctx)
        case 'country':
            return ctx.generators.country(ctx)
        case 'street':
            return ctx.generators.address(ctx)
        case 'phone':
            return ctx.generators.phone(ctx)
        case 'uuid':
            return ctx.generators.uuid(ctx)
        case 'string':
            return ctx.generators.firstName(ctx) // Fallback
        default:
            // If it matches a generator name, use it
            if (ctx.generators[type]) {
                return ctx.generators[type](ctx)
            }
            return null
    }
}

function generateObjectId(random: Random): string {
    const chars = '0123456789abcdef'
    let id = ''
    for (let i = 0; i < 24; i++) {
        id += chars[random.nextInt(0, 15)]
    }
    return id
}
