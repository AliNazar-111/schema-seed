/**
 * Normalized SQL types that map various database-specific types to a common set.
 */
export enum NormalizedSqlType {
    STRING = 'string',
    TEXT = 'text',
    INT = 'int',
    BIGINT = 'bigint',
    FLOAT = 'float',
    DECIMAL = 'decimal',
    BOOLEAN = 'boolean',
    DATE = 'date',
    DATETIME = 'datetime',
    JSON = 'json',
    UUID = 'uuid',
    ENUM = 'enum',
    BINARY = 'binary',
    OBJECTID = 'objectid',
}

/**
 * Metadata for a single column in a table.
 */
export interface ColumnSchema {
    name: string
    type: NormalizedSqlType
    /** The raw database-specific type string */
    rawType: string
    nullable: boolean
    defaultValue?: any
    /** For ENUM types, the list of allowed values */
    enumValues?: string[]
    /** Precision for decimal/float types */
    precision?: number
    /** Scale for decimal types */
    scale?: number
    /** Maximum length for string/binary types */
    maxLength?: number
    /** Whether this column is auto-incrementing / identity */
    isAutoIncrement: boolean
    /** Documentation or comments from the database */
    comment?: string
}

/**
 * Primary key definition.
 */
export interface PrimaryKeySchema {
    name?: string
    columns: string[]
}

/**
 * Foreign key relationship definition.
 */
export interface ForeignKeySchema {
    name?: string
    /** Columns in the current table */
    columns: string[]
    /** Referenced table name */
    referencedTable: string
    /** Referenced columns in the target table */
    referencedColumns: string[]
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

/**
 * Unique constraint definition.
 */
export interface UniqueConstraintSchema {
    name?: string
    columns: string[]
}

/**
 * Metadata for a single table.
 */
export interface TableSchema {
    name: string
    schema?: string
    columns: Record<string, ColumnSchema>
    primaryKey?: PrimaryKeySchema
    foreignKeys: ForeignKeySchema[]
    uniqueConstraints: UniqueConstraintSchema[]
    /** Estimated or actual row count */
    rowCount?: number
    comment?: string
}

/**
 * A complete representation of the database schema as a graph of tables.
 */
export interface SchemaGraph {
    tables: Record<string, TableSchema>
}

/**
 * Metadata for a single MongoDB collection.
 */
export interface MongoCollectionSchema {
    name: string
    fields: Record<string, ColumnSchema>
    /** Mapping of field names to referenced collections and fields, e.g. { "userId": "users._id" } */
    references?: Record<string, string>
}

/**
 * A complete representation of the MongoDB schema.
 */
export interface MongoSchema {
    collections: Record<string, MongoCollectionSchema>
}

/**
 * A batch of data to be inserted into a table.
 */
export interface SeedBatch {
    tableName: string
    rows: Record<string, any>[]
}

/**
 * The execution plan for seeding the database.
 */
export interface SeedPlan {
    /** The order in which tables should be seeded to satisfy foreign key constraints */
    insertOrder: string[]
    /** Grouped batches for execution */
    batches: SeedBatch[]
    /** Mapping of virtual IDs to actual database IDs for resolving references */
    referencesMap: Map<string, any>
}

export type OverrideFunction = (ctx: { i: number; random: any; refs: any }) => any

export interface WeightedEnumOverride {
    enum: any[]
    weights?: number[]
}

export interface DateBetweenOverride {
    dateBetween: [string | Date, string | Date]
}

export type ColumnOverride = OverrideFunction | WeightedEnumOverride | DateBetweenOverride | any

export type TableOverrides = Record<string, ColumnOverride>

export interface Hooks {
    beforeInsert?: (table: string, rows: any[]) => any[] | Promise<any[]>
    afterInsert?: (table: string, result: { insertedCount: number; durationMs: number }) => void | Promise<void>
}

export interface Plugin {
    name: string
    overrides?: Record<string, TableOverrides>
    generators?: Record<string, (ctx: any) => any>
    hooks?: Hooks
}

/**
 * Options for the seeding process.
 */
export interface SeedOptions {
    /** Number of rows to generate per table (can be a global number or per-table map) */
    rows?: number | Record<string, number>
    /** Seed for the random number generator to ensure reproducibility */
    seed?: number | string
    /** If true, only show what would happen without executing any writes */
    dryRun?: boolean
    /** Number of rows to insert in a single batch */
    batchSize?: number
    /** Safety flag to allow running against production environments */
    allowProduction?: boolean
    /** If true, also seed parent tables required by foreign keys even if not explicitly requested */
    withParents?: boolean
    /** If true, truncate tables before seeding */
    truncate?: boolean
    /** Specific tables to include in the seeding process */
    includeTables?: string[]
    /** Specific tables to exclude from the seeding process */
    excludeTables?: string[]
    /** Custom overrides for specific tables and columns */
    overrides?: Record<string, TableOverrides>
    /** Lifecycle hooks */
    hooks?: Hooks
    /** List of plugins to load */
    plugins?: (string | Plugin)[]
}

export interface RunnerContext {
    generators: Record<string, (ctx: any) => any>
    inferGenerator: (columnName: string, sqlType: any) => { generatorId: string; options?: any }
    overrides?: Record<string, any>
}

/**
 * Detailed report of the seeding operation's effects.
 */
export interface EffectReport {
    success: boolean
    /** Total time taken in milliseconds */
    durationMs: number
    /** Stats per table */
    tables: Record<
        string,
        {
            insertedCount: number
            error?: string
            durationMs: number
        }
    >
    /** Any global errors that occurred during the process */
    errors: Error[]
}
