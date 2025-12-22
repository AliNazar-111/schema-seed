import oracledb from 'oracledb'
import {
  SqlAdapter,
  SchemaGraph,
  SeedBatch,
  NormalizedSqlType,
  TableSchema,
  ColumnSchema
} from '@alinazar-111/schema-seed-core'

export class OracleAdapter implements SqlAdapter {
  private connection: oracledb.Connection | null = null
  private config: oracledb.ConnectionAttributes

  constructor(config: oracledb.ConnectionAttributes) {
    this.config = config
  }

  async connect(): Promise<void> {
    this.connection = await oracledb.getConnection(this.config)
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close()
      this.connection = null
    }
  }

  async begin(): Promise<void> {
    // Oracle doesn't have a specific BEGIN command like Postgres/MySQL
    // Transactions start automatically with the first DML statement.
    // We just need to ensure autoCommit is false (which it is by default).
  }

  async commit(): Promise<void> {
    await this.connection?.commit()
  }

  async rollback(): Promise<void> {
    await this.connection?.rollback()
  }

  async introspectSchema(): Promise<SchemaGraph> {
    if (!this.connection) throw new Error('Not connected')

    const schema: SchemaGraph = { tables: {} }
    const user = this.config.user?.toUpperCase()

    // Get tables
    const tablesRes = await this.connection.execute<{ TABLE_NAME: string, OWNER: string }>(
      `SELECT table_name, owner FROM all_tables WHERE owner = :owner`,
      { owner: user },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )

    for (const row of (tablesRes.rows || [])) {
      const tableName = row.TABLE_NAME
      schema.tables[tableName] = {
        name: tableName,
        schema: row.OWNER,
        columns: {},
        foreignKeys: [],
        uniqueConstraints: []
      }
    }

    // Get columns
    const columnsRes = await this.connection.execute<{
      TABLE_NAME: string,
      COLUMN_NAME: string,
      DATA_TYPE: string,
      NULLABLE: string,
      DATA_DEFAULT: any,
      IDENTITY_COLUMN: string
    }>(
      `SELECT table_name, column_name, data_type, nullable, data_default, identity_column 
       FROM all_tab_columns 
       WHERE owner = :owner`,
      { owner: user },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )

    for (const row of (columnsRes.rows || [])) {
      if (!schema.tables[row.TABLE_NAME]) continue

      const col: ColumnSchema = {
        name: row.COLUMN_NAME,
        type: this.mapOracleType(row.DATA_TYPE),
        rawType: row.DATA_TYPE,
        nullable: row.NULLABLE === 'Y',
        defaultValue: row.DATA_DEFAULT,
        isAutoIncrement: row.IDENTITY_COLUMN === 'YES'
      }
      schema.tables[row.TABLE_NAME].columns[row.COLUMN_NAME] = col
    }

    // Get Constraints (PK, FK, Unique)
    const constraintsRes = await this.connection.execute<{
      TABLE_NAME: string,
      CONSTRAINT_NAME: string,
      CONSTRAINT_TYPE: string,
      COLUMN_NAME: string,
      R_OWNER: string,
      R_CONSTRAINT_NAME: string
    }>(
      `SELECT c.table_name, c.constraint_name, c.constraint_type, col.column_name, c.r_owner, c.r_constraint_name
       FROM all_constraints c
       JOIN all_cons_columns col ON c.owner = col.owner AND c.constraint_name = col.constraint_name
       WHERE c.owner = :owner AND c.constraint_type IN ('P', 'R', 'U')`,
      { owner: user },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    )

    for (const row of (constraintsRes.rows || [])) {
      const table = schema.tables[row.TABLE_NAME]
      if (!table) continue

      if (row.CONSTRAINT_TYPE === 'P') {
        if (!table.primaryKey) table.primaryKey = { columns: [] }
        table.primaryKey.columns.push(row.COLUMN_NAME)
      } else if (row.CONSTRAINT_TYPE === 'U') {
        let constraint = table.uniqueConstraints.find(uc => uc.name === row.CONSTRAINT_NAME)
        if (!constraint) {
          constraint = { name: row.CONSTRAINT_NAME, columns: [] }
          table.uniqueConstraints.push(constraint)
        }
        constraint.columns.push(row.COLUMN_NAME)
      } else if (row.CONSTRAINT_TYPE === 'R') {
        // Foreign Key
        // We need to find the referenced table name from the referenced constraint
        const refRes = await this.connection.execute<{ TABLE_NAME: string, COLUMN_NAME: string }>(
          `SELECT table_name, column_name FROM all_cons_columns WHERE owner = :owner AND constraint_name = :cname`,
          { owner: row.R_OWNER, cname: row.R_CONSTRAINT_NAME },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )

        if (refRes.rows && refRes.rows.length > 0) {
          table.foreignKeys.push({
            name: row.CONSTRAINT_NAME,
            columns: [row.COLUMN_NAME],
            referencedTable: refRes.rows[0].TABLE_NAME,
            referencedColumns: [refRes.rows[0].COLUMN_NAME]
          })
        }
      }
    }

    return schema
  }

  async insertBatch(batch: SeedBatch): Promise<void> {
    if (!this.connection) throw new Error('Not connected')
    const { tableName, rows } = batch
    if (rows.length === 0) return

    const columns = Object.keys(rows[0])
    const bindDefs: Record<string, any> = {}

    // Oracle executeMany requires bindDefs for better performance and type safety
    for (const col of columns) {
      // We'll infer type from the first row or just use default
      bindDefs[col] = { type: oracledb.STRING, maxSize: 4000 } // Default to string for simplicity
    }

    const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${columns.map(c => `:${c}`).join(', ')})`

    await this.connection.executeMany(query, rows, {
      autoCommit: false,
      bindDefs
    })
  }

  async truncateTables(tableNames: string[]): Promise<void> {
    if (!this.connection) throw new Error('Not connected')

    for (const table of tableNames) {
      try {
        await this.connection.execute(`TRUNCATE TABLE "${table}"`)
      } catch (err: any) {
        // Fallback to DELETE if TRUNCATE fails (e.g. due to FKs or permissions)
        await this.connection.execute(`DELETE FROM "${table}"`)
      }
    }
  }

  readonly capabilities = {
    enums: false,
    deferrableConstraints: true,
    returning: true,
    identityInsert: true
  }

  private mapOracleType(oracleType: string): NormalizedSqlType {
    const type = oracleType.toUpperCase()
    if (type.includes('NUMBER')) return NormalizedSqlType.DECIMAL
    if (type.includes('INTEGER') || type.includes('INT')) return NormalizedSqlType.INT
    if (type.includes('CHAR') || type.includes('CLOB')) return NormalizedSqlType.STRING
    if (type.includes('DATE') || type.includes('TIMESTAMP')) return NormalizedSqlType.DATETIME
    if (type.includes('RAW')) return NormalizedSqlType.BINARY
    if (type.includes('BLOB')) return NormalizedSqlType.BINARY

    return NormalizedSqlType.STRING
  }
}

export function createOracleAdapter(config: oracledb.ConnectionAttributes): OracleAdapter {
  return new OracleAdapter(config)
}
