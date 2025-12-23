import pg from 'pg'
const { Client } = pg
import {
    SqlAdapter,
    SchemaGraph,
    SeedBatch,
    NormalizedSqlType,
    TableSchema,
    ColumnSchema
} from 'schema-seed-core'

export class PostgresAdapter implements SqlAdapter {
    private client: pg.Client

    constructor(connectionString: string) {
        this.client = new Client({ connectionString })
    }

    async connect(): Promise<void> {
        await this.client.connect()
    }

    async disconnect(): Promise<void> {
        await this.client.end()
    }

    async begin(): Promise<void> {
        await this.client.query('BEGIN')
    }

    async commit(): Promise<void> {
        await this.client.query('COMMIT')
    }

    async rollback(): Promise<void> {
        await this.client.query('ROLLBACK')
    }

    async introspectSchema(): Promise<SchemaGraph> {
        const schema: SchemaGraph = { tables: {} }

        // Get tables
        const tablesRes = await this.client.query(`
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      AND table_type = 'BASE TABLE'
    `)

        for (const row of tablesRes.rows) {
            const tableName = row.table_name
            schema.tables[tableName] = {
                name: tableName,
                schema: row.table_schema,
                columns: {},
                foreignKeys: [],
                uniqueConstraints: []
            }
        }

        // Get columns
        const columnsRes = await this.client.query(`
      SELECT table_name, column_name, data_type, is_nullable, column_default, udt_name
      FROM information_schema.columns
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    `)

        for (const row of columnsRes.rows) {
            if (!schema.tables[row.table_name]) continue

            const col: ColumnSchema = {
                name: row.column_name,
                type: this.mapPostgresType(row.data_type, row.udt_name),
                rawType: row.data_type,
                nullable: row.is_nullable === 'YES',
                defaultValue: row.column_default,
                isAutoIncrement: row.column_default?.includes('nextval') || false
            }
            schema.tables[row.table_name].columns[row.column_name] = col
        }

        // Get Foreign Keys
        const fkRes = await this.client.query(`
      SELECT
          tc.table_name, kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `)

        for (const row of fkRes.rows) {
            if (!schema.tables[row.table_name]) continue
            schema.tables[row.table_name].foreignKeys.push({
                columns: [row.column_name],
                referencedTable: row.foreign_table_name,
                referencedColumns: [row.foreign_column_name]
            })
        }

        // Get Primary Keys
        const pkRes = await this.client.query(`
      SELECT tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
    `)

        for (const row of pkRes.rows) {
            if (!schema.tables[row.table_name]) continue
            if (!schema.tables[row.table_name].primaryKey) {
                schema.tables[row.table_name].primaryKey = { columns: [] }
            }
            schema.tables[row.table_name].primaryKey!.columns.push(row.column_name)
        }

        return schema
    }

    async insertBatch(batch: SeedBatch): Promise<void> {
        const { tableName, rows } = batch
        if (rows.length === 0) return

        const columns = Object.keys(rows[0])
        const placeholders = rows.map((_, rowIndex) =>
            `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`
        ).join(', ')

        const values = rows.flatMap(row => columns.map(col => row[col]))
        const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders}`

        await this.client.query(query, values)
    }

    async truncateTables(tableNames: string[]): Promise<void> {
        if (tableNames.length === 0) return
        const quotedNames = tableNames.map(t => `"${t}"`).join(', ')
        await this.client.query(`TRUNCATE ${quotedNames} RESTART IDENTITY CASCADE`)
    }

    readonly capabilities = {
        enums: true,
        deferrableConstraints: true,
        returning: true,
        identityInsert: false
    }

    private mapPostgresType(pgType: string, udtName: string): NormalizedSqlType {
        const type = pgType.toLowerCase()
        const udt = udtName.toLowerCase()

        if (type.includes('int') || type.includes('serial')) {
            if (type.includes('big') || udt.includes('int8')) return NormalizedSqlType.BIGINT
            return NormalizedSqlType.INT
        }
        if (type.includes('char') || type.includes('text') || type === 'character varying') return NormalizedSqlType.STRING
        if (type.includes('bool')) return NormalizedSqlType.BOOLEAN
        if (type.includes('timestamp') || type.includes('date')) return NormalizedSqlType.DATETIME
        if (type.includes('json')) return NormalizedSqlType.JSON
        if (type.includes('numeric') || type.includes('decimal')) return NormalizedSqlType.DECIMAL
        if (type.includes('float') || type.includes('real')) return NormalizedSqlType.FLOAT
        if (udt === 'uuid') return NormalizedSqlType.UUID

        return NormalizedSqlType.STRING
    }
}

export function createPostgresAdapter(connectionString: string): PostgresAdapter {
    return new PostgresAdapter(connectionString)
}
