import { SchemaGraph, SeedBatch, EffectReport } from './types.js'

/**
 * Base interface for all database adapters.
 */
export interface DbAdapter {
    /** Establish connection to the database */
    connect(): Promise<void>
    /** Close the database connection */
    disconnect(): Promise<void>

    /** Start a new transaction */
    begin(): Promise<void>
    /** Commit the current transaction */
    commit(): Promise<void>
    /** Rollback the current transaction */
    rollback(): Promise<void>
}

/**
 * Adapter interface for SQL-based databases (Postgres, MySQL, SQLite, etc.)
 */
export interface SqlAdapter extends DbAdapter {
    /**
     * Introspect the database to build a SchemaGraph.
     */
    introspectSchema(): Promise<SchemaGraph>

    /**
     * Insert a batch of rows into a table.
     * @param batch The batch of data to insert
     */
    insertBatch(batch: SeedBatch): Promise<void>

    /**
     * Truncate the specified tables.
     * @param tableNames List of tables to truncate
     */
    truncateTables(tableNames: string[]): Promise<void>

    /**
     * Capabilities and flags for the specific SQL dialect.
     */
    readonly capabilities: {
        /** Supports native ENUM types */
        enums: boolean
        /** Supports deferrable constraints (e.g., Postgres) */
        deferrableConstraints: boolean
        /** Supports RETURNING clause for inserted IDs */
        returning: boolean
        /** Requires explicit IDENTITY_INSERT ON for manual ID insertion (e.g., MSSQL) */
        identityInsert: boolean
    }
}

/**
 * Adapter interface for MongoDB.
 */
export interface MongoAdapter extends DbAdapter {
    /**
     * Introspect collections and their schemas if possible.
     */
    introspectCollections?(): Promise<any>

    /**
     * Insert many documents into a collection.
     * @param collection Name of the collection
     * @param documents Array of documents to insert
     */
    insertMany(collection: string, documents: any[]): Promise<void>

    /**
     * Get the JSON Schema validator for a collection if it exists.
     * @param collection Name of the collection
     */
    getValidatorSchema?(collection: string): Promise<any>

    /**
     * Truncate (delete all documents from) the specified collections.
     * @param collections List of collection names
     */
    truncateCollections?(collections: string[]): Promise<void>
}
