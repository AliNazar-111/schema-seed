import { NormalizedSqlType } from 'schema-seed-core'
import { GeneratorId } from './generators.js'

export interface InferredGenerator {
    generatorId: GeneratorId
    options?: Record<string, any>
}

export function inferGenerator(columnName: string, sqlType: NormalizedSqlType): InferredGenerator {
    const name = columnName.toLowerCase()

    // Semantic matches based on column name
    if (name.includes('email')) return { generatorId: 'email' }
    if (name.includes('first_name') || name.includes('firstname')) return { generatorId: 'firstName' }
    if (name.includes('last_name') || name.includes('lastname')) return { generatorId: 'lastName' }
    if (name.includes('full_name') || name.includes('fullname') || name === 'name') return { generatorId: 'fullName' }
    if (name.includes('phone') || name.includes('mobile') || name.includes('tel')) return { generatorId: 'phone' }
    if (name.includes('user_name') || name.includes('username') || name === 'login') return { generatorId: 'username' }
    if (name.includes('url') || name.includes('website') || name.includes('link')) return { generatorId: 'url' }
    if (name.includes('country')) return { generatorId: 'country' }
    if (name.includes('city')) return { generatorId: 'city' }
    if (name.includes('address')) return { generatorId: 'address' }
    if (name.includes('uuid') || name.includes('guid')) return { generatorId: 'uuid' }
    if (name.includes('created_at') || name.includes('updated_at')) return { generatorId: 'dateRecent' }
    if (name.includes('birth') || name.includes('date')) return { generatorId: 'datePast' }

    // Fallback based on SQL type
    switch (sqlType) {
        case NormalizedSqlType.BOOLEAN:
            return { generatorId: 'booleanWeighted' }
        case NormalizedSqlType.INT:
        case NormalizedSqlType.BIGINT:
            return { generatorId: 'intRange', options: { min: 1, max: 1000000 } }
        case NormalizedSqlType.FLOAT:
        case NormalizedSqlType.DECIMAL:
            return { generatorId: 'decimalRange', options: { min: 0, max: 1000, precision: 2 } }
        case NormalizedSqlType.DATE:
        case NormalizedSqlType.DATETIME:
            return { generatorId: 'dateRecent' }
        case NormalizedSqlType.UUID:
            return { generatorId: 'uuid' }
        case NormalizedSqlType.JSON:
            return { generatorId: 'textSentence' } // Placeholder for JSON
        default:
            return { generatorId: 'textSentence' }
    }
}
