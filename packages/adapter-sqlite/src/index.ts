import Database from 'better-sqlite3'
import {
  SqlAdapter,
  SchemaGraph,
  SeedBatch,
  NormalizedSqlType,
  TableSchema,
  ColumnSchema
} from '@alinazar-111/schema-seed-core'

export class SqliteAdapter implements SqlAdapter {
  private db: Database.Database | null = null
  private filename: string

  constructor(filename: string) {
    this.filename = filename
  }

  async connect(): Promise<void> {
    this.db = new Database(this.filename)
    this.db.pragma('foreign_keys = ON')
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  async begin(): Promise<void> {
    this.db?.prepare('BEGIN').run()
  }

  async commit(): Promise<void> {
    this.db?.prepare('COMMIT').run()
  }

  async rollback(): Promise<void> {
    this.db?.prepare('ROLLBACK').run()
  }

  async introspectSchema(): Promise<SchemaGraph> {
    if (!this.db) throw new Error('Not connected')

    const schema: SchemaGraph = { tables: {} }

    // Get tables
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[]

    for (const table of tables) {
      const tableName = table.name
      schema.tables[tableName] = {
        name: tableName,
        columns: {},
        foreignKeys: [],
        uniqueConstraints: []
      }

      // Get columns
      const columns = this.db.prepare(`PRAGMA table_info("${tableName}")`).all() as any[]
      for (const col of columns) {
        const colName = col.name
        const column: ColumnSchema = {
          name: colName,
          type: this.mapSqliteType(col.type),
          rawType: col.type,
          nullable: col.notnull === 0,
          defaultValue: col.dflt_value,
          isAutoIncrement: false // SQLite handles this via rowid or AUTOINCREMENT keyword
        }

        if (col.pk > 0) {
          if (!schema.tables[tableName].primaryKey) {
            schema.tables[tableName].primaryKey = { columns: [] }
          }
          schema.tables[tableName].primaryKey!.columns.push(colName)
          // In SQLite, an INTEGER PRIMARY KEY is automatically auto-incrementing
          if (column.type === NormalizedSqlType.INT || column.type === NormalizedSqlType.BIGINT) {
            column.isAutoIncrement = true
          }
        }

        schema.tables[tableName].columns[colName] = column
      }

      // Get Foreign Keys
      const fks = this.db.prepare(`PRAGMA foreign_key_list("${tableName}")`).all() as any[]
      for (const fk of fks) {
        schema.tables[tableName].foreignKeys.push({
          columns: [fk.from],
          referencedTable: fk.table,
          referencedColumns: [fk.to]
        })
      }

      // Get Unique Constraints
      const indexes = this.db.prepare(`PRAGMA index_list("${tableName}")`).all() as any[]
      for (const idx of indexes) {
        if (idx.unique === 1 && idx.origin !== 'pk') {
          const idxInfo = this.db.prepare(`PRAGMA index_info("${idx.name}")`).all() as any[]
          schema.tables[tableName].uniqueConstraints.push({
            name: idx.name,
            columns: idxInfo.map(info => info.name)
          })
        }
      }
    }

    return schema
  }

  async insertBatch(batch: SeedBatch): Promise<void> {
    if (!this.db) throw new Error('Not connected')
    const { tableName, rows } = batch
    if (rows.length === 0) return

    const columns = Object.keys(rows[0])
    const placeholders = columns.map(() => '?').join(', ')
    const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`

    const stmt = this.db.prepare(query)

    // better-sqlite3 is sync, but we are in an async method
    // We can use a transaction for performance
    const insertMany = this.db.transaction((data: any[]) => {
      for (const row of data) {
        const values = columns.map(col => row[col])
        stmt.run(values)
      }
    })

    insertMany(rows)
  }

  async truncateTables(tableNames: string[]): Promise<void> {
    if (!this.db) throw new Error('Not connected')

    this.db.pragma('foreign_keys = OFF')
    try {
      for (const table of tableNames) {
        this.db.prepare(`DELETE FROM "${table}"`).run()
        // Reset auto-increment
        this.db.prepare(`DELETE FROM sqlite_sequence WHERE name = ?`).run(table)
      }
    } finally {
      this.db.pragma('foreign_keys = ON')
    }
  }

  readonly capabilities = {
    enums: false,
    deferrableConstraints: false,
    returning: true,
    identityInsert: true // SQLite allows inserting into PKs
  }

  private mapSqliteType(sqliteType: string): NormalizedSqlType {
    const type = sqliteType.toUpperCase()
    if (type.includes('INT')) return NormalizedSqlType.INT
    if (type.includes('CHAR') || type.includes('TEXT') || type === '') return NormalizedSqlType.STRING
    if (type.includes('BLOB')) return NormalizedSqlType.BINARY
    if (type.includes('REAL') || type.includes('FLOA') || type.includes('DOUB')) return NormalizedSqlType.FLOAT
    if (type.includes('BOOL')) return NormalizedSqlType.BOOLEAN
    if (type.includes('DATE') || type.includes('TIME')) return NormalizedSqlType.DATETIME

    return NormalizedSqlType.STRING
  }
}

export function createSqliteAdapter(filename: string): SqliteAdapter {
  return new SqliteAdapter(filename)
}
