export default {
    dbType: 'mongodb',
    seed: 123,
    mongodb: {
        uri: 'mongodb+srv://alinazar_db_user:alikon123@cluster0.hyedybk.mongodb.net/?appName=Cluster0',

        collections: {
            users: {
                fields: {
                    _id: 'objectId',
                    email: { type: 'email', unique: true },
                    firstName: 'firstName',
                    lastName: 'lastName',
                    age: { type: 'int', min: 18, max: 65 },
                    status: {
                        type: 'enum',
                        values: ['active', 'blocked'],
                        weights: [95, 5]
                    },
                    profile: {
                        type: 'object',
                        fields: {
                            city: 'city',
                            country: 'country'
                        }
                    },
                    createdAt: {
                        type: 'dateBetween',
                        from: '2024-01-01',
                        to: '2025-12-31'
                    }
                }
            },

            orders: {
                rows: 20,
                fields: {
                    _id: 'objectId',
                    userId: { ref: 'users._id' },
                    total: { type: 'decimal', min: 5, max: 500 },
                    createdAt: 'dateRecent'
                }
            }
        }
    }
}
