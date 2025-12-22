import { describe, it, expect } from 'vitest'
import { createMongoAdapter, MongodbAdapter } from '../src/index.js'

describe('adapter-mongodb', () => {
    it('should create an instance of MongodbAdapter', () => {
        const adapter = createMongoAdapter('mongodb://localhost:27017', 'testdb')
        expect(adapter).toBeInstanceOf(MongodbAdapter)
    })

    it('should have required MongoAdapter methods', () => {
        const adapter = createMongoAdapter('mongodb://localhost')
        expect(adapter.connect).toBeDefined()
        expect(adapter.insertMany).toBeDefined()
        expect(adapter.introspectCollections).toBeDefined()
    })
})
