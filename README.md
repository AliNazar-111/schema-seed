# schema-seed

A production-ready tool to seed your database with realistic, deterministic data. `schema-seed` automatically introspects your database schema, resolves foreign key dependencies, and generates semantic data using a powerful inference engine.

## Features

- **Multi-database support**: Native adapters for Postgres, MySQL, SQLite, MSSQL, Oracle, and MongoDB.
- **Dependency Resolution**: Automatically calculates the correct insertion order based on foreign keys.
- **Semantic Inference**: Intelligently chooses generators based on column names and types (e.g., `email`, `first_name`, `created_at`).
- **Deterministic**: Use a fixed seed to generate the exact same data every time.
- **Extensible**: Powerful override system, lifecycle hooks, and a plugin architecture.
- **Safety First**: Production environment detection and mandatory confirmation flags.
- **Redaction**: Sensitive data (passwords, tokens) is automatically redacted from reports.

## Installation

```bash
npm install -g @schema-seed/cli
```

## Quick Start

### Seed All Tables
```bash
schema-seed seed --db "postgres://user:pass@localhost:5432/mydb" --all
```

### Seed Specific Table
```bash
schema-seed seed --db "mysql://user:pass@localhost:3306/mydb" --table users --rows 50
```

### Seed with Parents
Automatically seeds parent tables required by foreign keys:
```bash
schema-seed seed --db "sqlite://data.db" --table orders --with-parents
```

### Deterministic Seeding
Generate the same data every time:
```bash
schema-seed seed --db "postgres://localhost/db" --all --seed "my-fixed-seed"
```

## Configuration (`seed.config.ts`)

For advanced usage, create a `seed.config.ts` in your project root.

```typescript
import { defineConfig } from '@schema-seed/cli';

export default defineConfig({
  db: "postgres://localhost/mydb",
  rows: 10,
  overrides: {
    users: {
      // Custom logic
      email: ({ i }) => `user${i}@example.com`,
      // Weighted enum
      status: { enum: ["active", "blocked"], weights: [95, 5] },
      // Date range
      created_at: { dateBetween: ["2024-01-01", "2025-12-31"] },
      // Literal value
      role: 'user'
    }
  },
  hooks: {
    beforeInsert: async (table, rows) => {
      console.log(`Preparing ${rows.length} rows for ${table}`);
      return rows;
    }
  },
  plugins: ["@schema-seed/plugin-ecommerce"]
});
```

## MongoDB Support

`schema-seed` supports MongoDB with cross-collection references.

```typescript
// seed.config.ts
export default {
  db: "mongodb://localhost:27017/shop",
  mongoSchema: {
    collections: {
      users: {
        name: 'users',
        fields: {
          name: { name: 'name', type: 'string' },
          email: { name: 'email', type: 'string' }
        }
      },
      orders: {
        name: 'orders',
        fields: {
          total: { name: 'total', type: 'decimal' },
          userId: { name: 'userId', type: 'objectid' }
        },
        // Define relationship
        references: { userId: 'users._id' }
      }
    }
  }
}
```

## Safety Features

- **Production Check**: Refuses to run if `NODE_ENV=production` or if the DB host looks like production. Use `--allow-production` to override.
- **Confirmation**: Require a typed string to proceed.
  ```bash
  schema-seed seed --db "postgres://prod-db/db" --allow-production --confirm "SEED_PROD"
  ```

## Supported Adapters

- `@schema-seed/adapter-postgres`
- `@schema-seed/adapter-mysql`
- `@schema-seed/adapter-sqlite`
- `@schema-seed/adapter-mssql`
- `@schema-seed/adapter-oracle`
- `@schema-seed/adapter-mongodb`

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to get involved.

## License

MIT
