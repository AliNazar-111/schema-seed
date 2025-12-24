export type MongoFieldType =
    | 'string'
    | 'int'
    | 'float'
    | 'decimal'
    | 'boolean'
    | 'date'
    | 'dateRecent'
    | 'dateBetween'
    | 'email'
    | 'firstName'
    | 'lastName'
    | 'fullName'
    | 'city'
    | 'country'
    | 'street'
    | 'phone'
    | 'uuid'
    | 'objectId'
    | 'enum'
    | 'object'
    | 'array'

export interface MongoFieldConfigObject {
    type?: MongoFieldType
    unique?: boolean
    min?: number
    max?: number
    from?: string | Date
    to?: string | Date
    values?: any[]
    weights?: number[]
    fields?: Record<string, MongoFieldConfig>
    of?: MongoFieldConfig
    minItems?: number
    maxItems?: number
    ref?: string
}

export type MongoFieldConfig = MongoFieldType | MongoFieldConfigObject

export interface MongoCollectionConfig {
    rows?: number
    fields: Record<string, MongoFieldConfig>
}

export interface MongoSeedConfig {
    dbType: 'mongodb'
    seed?: number | string
    truncate?: boolean
    rows?: number
    mongodb: {
        uri: string
        collections: Record<string, MongoCollectionConfig>
    }
}
