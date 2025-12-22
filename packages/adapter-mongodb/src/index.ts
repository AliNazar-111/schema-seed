import { MongoClient, Db, Document } from 'mongodb'
import {
  MongoAdapter,
  DbAdapter
} from '@schema-seed/core'

export class MongodbAdapter implements MongoAdapter {
  private client: MongoClient
  private db: Db | null = null
  private dbName: string | undefined

  constructor(uri: string, dbName?: string) {
    this.client = new MongoClient(uri)
    this.dbName = dbName
  }

  async connect(): Promise<void> {
    await this.client.connect()
    this.db = this.client.db(this.dbName)
  }

  async disconnect(): Promise<void> {
    await this.client.close()
    this.db = null
  }

  async begin(): Promise<void> {
    // MongoDB supports sessions/transactions but for seeding we usually don't need them
    // or we'd need to handle replica sets. Skipping for now.
  }

  async commit(): Promise<void> {
  }

  async rollback(): Promise<void> {
  }

  async introspectCollections(): Promise<string[]> {
    if (!this.db) throw new Error('Not connected')
    const collections = await this.db.listCollections().toArray()
    return collections.map((c: any) => c.name)
  }

  async getValidatorSchema(collectionName: string): Promise<any> {
    if (!this.db) throw new Error('Not connected')
    const collections = await this.db.listCollections({ name: collectionName }).toArray()
    const coll = collections[0] as any
    if (coll && coll.options?.validator) {
      return coll.options.validator
    }
    return null
  }

  async insertMany(collection: string, documents: any[]): Promise<void> {
    if (!this.db) throw new Error('Not connected')
    if (documents.length === 0) return
    await this.db.collection(collection).insertMany(documents)
  }

  async truncateCollections(collections: string[]): Promise<void> {
    if (!this.db) throw new Error('Not connected')
    for (const name of collections) {
      await this.db.collection(name).deleteMany({})
    }
  }
}

export function createMongoAdapter(uri: string, dbName?: string): MongodbAdapter {
  return new MongodbAdapter(uri, dbName)
}
