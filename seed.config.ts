import { defineConfig } from '@schema-seed/cli'
import { NormalizedSqlType } from '@schema-seed/core'

export default defineConfig({
    // Replace <password> with your actual MongoDB password
    db: process.env.DB_URL,

    // MongoDB specific schema (since Mongo is schema-less, we define the fields we want to seed)
    mongoSchema: {
        collections: {
            users: {
                name: 'users',
                fields: {
                    email: { name: 'email', type: NormalizedSqlType.STRING, rawType: 'string', nullable: false, isAutoIncrement: false },
                    firstName: { name: 'firstName', type: NormalizedSqlType.STRING, rawType: 'string', nullable: false, isAutoIncrement: false },
                    lastName: { name: 'lastName', type: NormalizedSqlType.STRING, rawType: 'string', nullable: false, isAutoIncrement: false },
                    age: { name: 'age', type: NormalizedSqlType.INT, rawType: 'int', nullable: true, isAutoIncrement: false },
                    createdAt: { name: 'createdAt', type: NormalizedSqlType.DATETIME, rawType: 'date', nullable: false, isAutoIncrement: false }
                }
            },
            posts: {
                name: 'posts',
                fields: {
                    title: { name: 'title', type: NormalizedSqlType.STRING, rawType: 'string', nullable: false, isAutoIncrement: false },
                    content: { name: 'content', type: NormalizedSqlType.TEXT, rawType: 'string', nullable: false, isAutoIncrement: false },
                    authorId: { name: 'authorId', type: NormalizedSqlType.OBJECTID, rawType: 'objectid', nullable: false, isAutoIncrement: false }
                },
                references: {
                    authorId: 'users._id'
                }
            }
        }
    },

    rows: 10, // Seed 10 rows per collection
    truncate: true, // Clear collections before seeding
})
