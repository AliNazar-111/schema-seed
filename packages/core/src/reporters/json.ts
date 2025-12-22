import { EffectReport } from '../types.js'

export function reportToJson(report: EffectReport): string {
    return JSON.stringify(report, (key, value) => {
        if (value instanceof Error) {
            return { message: value.message, stack: value.stack }
        }
        return value
    }, 2)
}
