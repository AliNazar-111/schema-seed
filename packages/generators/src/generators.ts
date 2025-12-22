import { Random } from '@alinazar-111/schema-seed-core'
import * as data from './data.js'

export interface GeneratorContext {
    random: Random
}

export const generators = {
    email: (ctx: GeneratorContext) => {
        const user = generators.username(ctx)
        const domain = ctx.random.pick(data.domains)
        return `${user}@${domain}`
    },

    firstName: (ctx: GeneratorContext) => ctx.random.pick(data.firstNames),

    lastName: (ctx: GeneratorContext) => ctx.random.pick(data.lastNames),

    fullName: (ctx: GeneratorContext) => `${generators.firstName(ctx)} ${generators.lastName(ctx)}`,

    phone: (ctx: GeneratorContext) => {
        const part = () => ctx.random.nextInt(100, 999)
        const last = () => ctx.random.nextInt(1000, 9999)
        return `+1-${part()}-${part()}-${last()}`
    },

    username: (ctx: GeneratorContext) => {
        const first = generators.firstName(ctx).toLowerCase()
        const last = generators.lastName(ctx).toLowerCase()
        const suffix = ctx.random.nextInt(10, 99)
        return `${first}.${last}${suffix}`
    },

    url: (ctx: GeneratorContext) => {
        const domain = ctx.random.pick(data.domains)
        const path = generators.firstName(ctx).toLowerCase()
        return `https://${domain}/${path}`
    },

    country: (ctx: GeneratorContext) => ctx.random.pick(data.countries),

    city: (ctx: GeneratorContext) => ctx.random.pick(data.cities),

    address: (ctx: GeneratorContext) => {
        const num = ctx.random.nextInt(1, 9999)
        const street = ctx.random.pick(data.streetNames)
        return `${num} ${street}`
    },

    uuid: (ctx: GeneratorContext) => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (ctx.random.next() * 16) | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
        })
    },

    dateRecent: (ctx: GeneratorContext, days = 30) => {
        const date = new Date()
        date.setDate(date.getDate() - ctx.random.nextInt(0, days))
        return date.toISOString()
    },

    datePast: (ctx: GeneratorContext, years = 10) => {
        const date = new Date()
        date.setFullYear(date.getFullYear() - ctx.random.nextInt(1, years))
        return date.toISOString()
    },

    booleanWeighted: (ctx: GeneratorContext, weight = 0.5) => ctx.random.boolean(weight),

    intRange: (ctx: GeneratorContext, min = 0, max = 100) => ctx.random.nextInt(min, max),

    decimalRange: (ctx: GeneratorContext, min = 0, max = 100, precision = 2) => {
        const val = ctx.random.next() * (max - min) + min
        return parseFloat(val.toFixed(precision))
    },

    textSentence: (ctx: GeneratorContext) => ctx.random.pick(data.sentences),

    textParagraph: (ctx: GeneratorContext, sentences = 3) => {
        return Array.from({ length: sentences }, () => generators.textSentence(ctx)).join(' ')
    }
}

export type GeneratorId = keyof typeof generators
