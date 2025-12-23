import mssql from 'mssql'
import {
  SqlAdapter,
  SchemaGraph,
  SeedBatch,
  NormalizedSqlType,
  TableSchema,
  ColumnSchema
} from 'schema-seed-core'

export class MssqlAdapter implements SqlAdapter {
  private pool: mssql.ConnectionPool | null = null
  private transaction: mssql.Transaction | null = null
  private config: string | mssql.config

  constructor(config: string | mssql.config) {
    this.config = config
  }

  async connect(): Promise<void> {
    this.pool = await new mssql.ConnectionPool(this.config as any).connect()
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.close()
      this.pool = null
    }
  }

  async begin(): Promise<void> {
    this.transaction = new mssql.Transaction(this.pool!)
    await this.transaction.begin()
  }

  async commit(): Promise<void> {
    if (this.transaction) {
      await this.transaction.commit()
      this.transaction = null
    }
  }

  async rollback(): Promise<void> {
    if (this.transaction) {
      await this.transaction.rollback()
      this.transaction = null
    }
  }

  private getRequest(): mssql.Request {
    if (this.transaction) return new mssql.Request(this.transaction)
    if (this.pool) return new mssql.Request(this.pool)
    throw new Error('Not connected')
  }

  async introspectSchema(): Promise<SchemaGraph> {
    const schema: SchemaGraph = { tables: {} }

    // Get tables
    const tablesRes = await this.getRequest().query(`
      SELECT t.name AS table_name, s.name AS schema_name
      FROM sys.tables t
      JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE t.is_ms_shipped = 0
    `)

    for (const row of tablesRes.recordset) {
      const tableName = row.table_name
      schema.tables[tableName] = {
        name: tableName,
        schema: row.schema_name,
        columns: {},
        foreignKeys: [],
        uniqueConstraints: []
      }
    }

    // Get columns
    const columnsRes = await this.getRequest().query(`
      SELECT 
        t.name AS table_name,
        c.name AS column_name,
        ty.name AS data_type,
        c.is_nullable,
        dc.definition AS column_default,
        c.is_identity
      FROM sys.columns c
      JOIN sys.tables t ON c.object_id = t.object_id
      JOIN sys.types ty ON c.user_type_id = ty.user_type_id
      LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
      WHERE t.is_ms_shipped = 0
    `)

    for (const row of columnsRes.recordset) {
      if (!schema.tables[row.table_name]) continue

      const col: ColumnSchema = {
        name: row.column_name,
        type: this.mapMssqlType(row.data_type),
        rawType: row.data_type,
        nullable: row.is_nullable,
        defaultValue: row.column_default,
        isAutoIncrement: row.is_identity
      }
      schema.tables[row.table_name].columns[row.column_name] = col
    }

    // Get Foreign Keys
    const fkRes = await this.getRequest().query(`
      SELECT 
        obj.name AS constraint_name,
        sch.name AS schema_name,
        t.name AS table_name,
        col.name AS column_name,
        rt.name AS referenced_table_name,
        rcol.name AS referenced_column_name
      FROM sys.foreign_key_columns fkc
      INNER JOIN sys.objects obj ON obj.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables t ON t.object_id = fkc.parent_object_id
      INNER JOIN sys.schemas sch ON sch.schema_id = t.schema_id
      INNER JOIN sys.columns col ON col.column_id = fkc.parent_column_id AND col.object_id = t.object_id
      INNER JOIN sys.tables rt ON rt.object_id = fkc.referenced_object_id
      INNER JOIN sys.columns rcol ON rcol.column_id = fkc.referenced_column_id AND rcol.object_id = rt.object_id
    `)

    for (const row of fkRes.recordset) {
      if (!schema.tables[row.table_name]) continue
      schema.tables[row.table_name].foreignKeys.push({
        name: row.constraint_name,
        columns: [row.column_name],
        referencedTable: row.referenced_table_name,
        referencedColumns: [row.referenced_column_name]
      })
    }

    // Get Primary Keys
    const pkRes = await this.getRequest().query(`
      SELECT 
        t.name AS table_name,
        c.name AS column_name
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      WHERE i.is_primary_key = 1
    `)

    for (const row of pkRes.recordset) {
      if (!schema.tables[row.table_name]) continue
      if (!schema.tables[row.table_name].primaryKey) {
        schema.tables[row.table_name].primaryKey = { columns: [] }
      }
      schema.tables[row.table_name].primaryKey!.columns.push(row.column_name)
    }

    return schema
  }

  async insertBatch(batch: SeedBatch): Promise<void> {
    if (!this.pool) throw new Error('Not connected')
    const { tableName, rows } = batch
    if (rows.length === 0) return

    const columns = Object.keys(rows[0])

    // Check if any column is an identity column
    const tableSchema = (await this.introspectSchema()).tables[tableName]
    const hasIdentity = Object.values(tableSchema.columns).some(c => c.isAutoIncrement)

    const request = this.getRequest()

    if (hasIdentity) {
      await this.getRequest().query(`SET IDENTITY_INSERT [${tableName}] ON`)
    }

    try {
      // MSSQL doesn't support multi-row INSERT with parameters in a simple way like MySQL/Postgres
      // We'll use a Table-Valued Parameter or just multiple inserts in a transaction if small
      // For simplicity here, we'll build a large query string with parameters

      const valuesStrings = []
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rowParams = []
        for (let j = 0; j < columns.length; j++) {
          const colName = columns[j]
          const paramName = `p${i}_${j}`
          request.input(paramName, row[colName])
          rowParams.push(`@${paramName}`)
        }
        valuesStrings.push(`(${rowParams.join(', ')})`)
      }

      const query = `INSERT INTO [${tableName}] (${columns.map(c => `[${c}]`).join(', ')}) VALUES ${valuesStrings.join(', ')}`
      await request.query(query)
    } finally {
      if (hasIdentity) {
        await this.getRequest().query(`SET IDENTITY_INSERT [${tableName}] OFF`)
      }
    }
  }

  async truncateTables(tableNames: string[]): Promise<void> {
    if (!this.pool) throw new Error('Not connected')

    for (const table of tableNames) {
      try {
        await this.getRequest().query(`TRUNCATE TABLE [${table}]`)
      } catch (err) {
        // If TRUNCATE fails (e.g. due to FK), fallback to DELETE
        await this.getRequest().query(`DELETE FROM [${table}]`)
      }
    }
  }

  readonly capabilities = {
    enums: false,
    deferrableConstraints: false,
    returning: true,
    identityInsert: true
  }

  private mapMssqlType(mssqlType: string): NormalizedSqlType {
    const type = mssqlType.toLowerCase()
    if (type.includes('int')) return NormalizedSqlType.INT
    if (type.includes('bigint')) return NormalizedSqlType.BIGINT
    if (type.includes('char') || type.includes('text') || type === 'varchar' || type === 'nvarchar') return NormalizedSqlType.STRING
    if (type === 'bit') return NormalizedSqlType.BOOLEAN
    if (type === 'date') return NormalizedSqlType.DATE
    if (type === 'datetime' || type === 'datetime2' || type === 'smalldatetime') return NormalizedSqlType.DATETIME
    if (type === 'decimal' || type === 'numeric' || type === 'money' || type === 'smallmoney') return NormalizedSqlType.DECIMAL
    if (type === 'float' || type === 'real') return NormalizedSqlType.FLOAT
    if (type === 'uniqueidentifier') return NormalizedSqlType.UUID
    if (type === 'varbinary' || type === 'binary' || type === 'image') return NormalizedSqlType.BINARY

    return NormalizedSqlType.STRING
  }
}

export function createMssqlAdapter(config: string | mssql.config): MssqlAdapter {
  return new MssqlAdapter(config)
}
