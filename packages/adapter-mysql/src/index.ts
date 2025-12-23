import mysql from 'mysql2/promise'
import {
  SqlAdapter,
  SchemaGraph,
  SeedBatch,
  NormalizedSqlType,
  TableSchema,
  ColumnSchema
} from 'schema-seed-core'

export class MySqlAdapter implements SqlAdapter {
  private connection: mysql.Connection | null = null
  private connectionString: string

  constructor(connectionString: string) {
    this.connectionString = connectionString
  }

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection(this.connectionString)
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end()
      this.connection = null
    }
  }

  async begin(): Promise<void> {
    await this.connection?.query('START TRANSACTION')
  }

  async commit(): Promise<void> {
    await this.connection?.query('COMMIT')
  }

  async rollback(): Promise<void> {
    await this.connection?.query('ROLLBACK')
  }

  async introspectSchema(): Promise<SchemaGraph> {
    if (!this.connection) throw new Error('Not connected')

    const schema: SchemaGraph = { tables: {} }
    const dbName = this.connection.config.database

    // Get tables
    const [tables] = await this.connection.query<any[]>(`
      SELECT TABLE_NAME, TABLE_SCHEMA
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
    `, [dbName])

    for (const row of tables) {
      const tableName = row.TABLE_NAME
      schema.tables[tableName] = {
        name: tableName,
        schema: row.TABLE_SCHEMA,
        columns: {},
        foreignKeys: [],
        uniqueConstraints: []
      }
    }

    // Get columns
    const [columns] = await this.connection.query<any[]>(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ?
    `, [dbName])

    for (const row of columns) {
      if (!schema.tables[row.TABLE_NAME]) continue

      const col: ColumnSchema = {
        name: row.COLUMN_NAME,
        type: this.mapMySqlType(row.DATA_TYPE, row.COLUMN_TYPE),
        rawType: row.DATA_TYPE,
        nullable: row.IS_NULLABLE === 'YES',
        defaultValue: row.COLUMN_DEFAULT,
        isAutoIncrement: row.EXTRA.includes('auto_increment'),
        enumValues: this.parseEnumValues(row.COLUMN_TYPE)
      }
      schema.tables[row.TABLE_NAME].columns[row.COLUMN_NAME] = col
    }

    // Get Foreign Keys
    const [fks] = await this.connection.query<any[]>(`
      SELECT 
        TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [dbName])

    for (const row of fks) {
      if (!schema.tables[row.TABLE_NAME]) continue
      schema.tables[row.TABLE_NAME].foreignKeys.push({
        name: row.CONSTRAINT_NAME,
        columns: [row.COLUMN_NAME],
        referencedTable: row.REFERENCED_TABLE_NAME,
        referencedColumns: [row.REFERENCED_COLUMN_NAME]
      })
    }

    // Get Primary Keys
    const [pks] = await this.connection.query<any[]>(`
      SELECT TABLE_NAME, COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND CONSTRAINT_NAME = 'PRIMARY'
    `, [dbName])

    for (const row of pks) {
      if (!schema.tables[row.TABLE_NAME]) continue
      if (!schema.tables[row.TABLE_NAME].primaryKey) {
        schema.tables[row.TABLE_NAME].primaryKey = { columns: [] }
      }
      schema.tables[row.TABLE_NAME].primaryKey!.columns.push(row.COLUMN_NAME)
    }

    return schema
  }

  async insertBatch(batch: SeedBatch): Promise<void> {
    if (!this.connection) throw new Error('Not connected')
    const { tableName, rows } = batch
    if (rows.length === 0) return

    const columns = Object.keys(rows[0])
    const values = rows.map(row => columns.map(col => row[col]))

    const query = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES ?`
    await this.connection.query(query, [values])
  }

  async truncateTables(tableNames: string[]): Promise<void> {
    if (!this.connection) throw new Error('Not connected')
    await this.connection.query('SET FOREIGN_KEY_CHECKS = 0')
    for (const table of tableNames) {
      await this.connection.query(`TRUNCATE TABLE \`${table}\``)
    }
    await this.connection.query('SET FOREIGN_KEY_CHECKS = 1')
  }

  readonly capabilities = {
    enums: true,
    deferrableConstraints: false,
    returning: false,
    identityInsert: false
  }

  private mapMySqlType(mysqlType: string, columnType: string): NormalizedSqlType {
    const type = mysqlType.toLowerCase()
    if (type.includes('int')) return NormalizedSqlType.INT
    if (type.includes('bigint')) return NormalizedSqlType.BIGINT
    if (type.includes('char') || type.includes('varchar') || type === 'text' || type.includes('text')) return NormalizedSqlType.STRING
    if (type === 'tinyint' && columnType.includes('(1)')) return NormalizedSqlType.BOOLEAN
    if (type === 'date') return NormalizedSqlType.DATE
    if (type.includes('time') || type === 'datetime') return NormalizedSqlType.DATETIME
    if (type === 'json') return NormalizedSqlType.JSON
    if (type === 'decimal') return NormalizedSqlType.DECIMAL
    if (type === 'float' || type === 'double') return NormalizedSqlType.FLOAT
    if (type === 'enum') return NormalizedSqlType.ENUM
    if (type === 'blob' || type.includes('binary')) return NormalizedSqlType.BINARY

    return NormalizedSqlType.STRING
  }

  private parseEnumValues(columnType: string): string[] | undefined {
    if (!columnType.startsWith('enum(')) return undefined
    return columnType
      .slice(5, -1)
      .split(',')
      .map(v => v.trim().replace(/^'|'$/g, ''))
  }
}

export function createMySqlAdapter(connectionString: string): MySqlAdapter {
  return new MySqlAdapter(connectionString)
}
