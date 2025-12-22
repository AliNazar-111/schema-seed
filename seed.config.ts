export default {
    dbType: 'mongodb',
    seed: 123,
    mongodb: {
        uri: 'mongodb://localhost:27017/appdb',

        collections: {
            users: {
                rows: 10,
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
