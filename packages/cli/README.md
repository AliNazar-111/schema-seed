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
npm install -g schema-seed
```

## Supported Databases

| Database | Adapter Package | Install Command | Connection String Example |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | `schema-seed-adapter-postgres` | `npm install -D schema-seed-adapter-postgres` | `postgres://user:pass@localhost:5432/db` |
| **MySQL** | `schema-seed-adapter-mysql` | `npm install -D schema-seed-adapter-mysql` | `mysql://user:pass@localhost:3306/db` |
| **SQLite** | `schema-seed-adapter-sqlite` | `npm install -D schema-seed-adapter-sqlite` | `sqlite://path/to/database.db` |
| **SQL Server** | `schema-seed-adapter-mssql` | `npm install -D schema-seed-adapter-mssql` | `sqlserver://user:pass@localhost:1433?database=db` |
| **Oracle** | `schema-seed-adapter-oracle` | `npm install -D schema-seed-adapter-oracle` | `oracle://user:pass@localhost:1521/service_name` |
| **MongoDB** | `schema-seed-adapter-mongodb` | `npm install -D schema-seed-adapter-mongodb` | `mongodb://localhost:27017/db` |

---

## Database-Specific Usage

### 🐘 PostgreSQL
Seed all tables in a Postgres database:
```bash
schema-seed seed --db "postgres://postgres:password@localhost:5432/my_db" --all
```

### 🐬 MySQL
Seed 50 rows into the `users` table:
```bash
schema-seed seed --db "mysql://root:password@127.0.0.1:3306/my_db" --table users --rows 50
```

### 📁 SQLite
Seed a local SQLite file:
```bash
schema-seed seed --db "sqlite://./dev.db" --all
```

### 🏢 Microsoft SQL Server (MSSQL)
Seed with identity insert support:
```bash
schema-seed seed --db "sqlserver://sa:Password123!@localhost:1433?database=master" --all
```

### 🔴 Oracle
Seed an Oracle database:
```bash
schema-seed seed --db "oracle://system:password@localhost:1521/xe" --all
```

### 🍃 MongoDB (Config-Based)
Since MongoDB is schema-less, you **must** define your collection structures in a `seed.config.ts` file. This file tells `schema-seed` what collections to create, how many documents to generate, and what fields each document should have.

#### 1. Create a `seed.config.ts` file
Create this file in your project root. Here is a comprehensive example:

```typescript
// seed.config.ts
import { defineConfig } from 'schema-seed';

export default defineConfig({
  dbType: 'mongodb',
  // Optional: Set a fixed seed for deterministic data (same data every run)
  seed: 123, 
  // Optional: Truncate collections before seeding (can also use CLI flag --truncate)
  truncate: true,
  
  mongodb: {
    // Connection string
    uri: 'mongodb+srv://user:pass@cluster0.mongodb.net/my_db',

    collections: {
      users: {
        // Optional: Number of documents to generate (defaults to 10 if omitted)
        rows: 20,
        fields: {
          _id: 'objectId', // Generates a MongoDB ObjectId
          email: { type: 'email', unique: true }, // Unique email
          firstName: 'firstName',
          lastName: 'lastName',
          age: { type: 'int', min: 18, max: 65 },
          status: {
            type: 'enum',
            values: ['active', 'blocked'],
            weights: [95, 5] // 95% active, 5% blocked
          },
          // Nested objects are fully supported
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
        rows: 50,
        fields: {
          _id: 'objectId',
          
          /** 🔗 Reference to users._id */
          userId: {
            type: 'objectId',
            ref: 'users' // Automatically picks a random _id from the 'users' collection
          },

          total: { type: 'decimal', min: 5, max: 500 },
          createdAt: 'dateRecent'
        }
      }
    }
  }
});
```

#### 2. Run the Seed Command
Once your config is ready, run the seed command:

```bash
schema-seed seed
```

#### MongoDB CLI Commands & Flags

| Command / Flag | Description | Example |
| :--- | :--- | :--- |
| **`seed`** | Main command to seed data. | `schema-seed seed` |
| `--truncate` | **Important**: Clears all data from the defined collections before seeding. Prevents duplicate key errors. | `schema-seed seed --truncate` |
| `--rows <n>` | Overrides the `rows` count for **ALL** collections in your config. | `schema-seed seed --rows 5` |
| `--dry-run` | Generates data and checks references but **DOES NOT** write to the database. Useful for testing config. | `schema-seed seed --dry-run` |
| `--db <uri>` | Override the connection URI from the CLI. | `schema-seed seed --db "mongodb://..."` |

#### Key Features for MongoDB

- **References (`ref`)**: Use `{ ref: 'collection_name' }` to populate a field with an `_id` from another collection. `schema-seed` automatically handles the insertion order (e.g., creates `users` before `orders`).
- **Truncation**: Use `truncate: true` in config or `--truncate` flag to clean the database before seeding.
- **Defaults**: If `rows` is not specified for a collection, it defaults to **10 documents**.
- **Determinism**: Set `seed: 123` (or any number) to generate the exact same dataset every time. Remove it for random data.

---

## Advanced Configuration (`seed.config.ts`)

For complex seeding logic, create a `seed.config.ts` in your project root.

```typescript
import { defineConfig } from 'schema-seed';

export default defineConfig({
  db: "postgres://localhost/mydb",
  rows: 10,
  overrides: {
    users: {
      // Custom function
      email: ({ i }) => `user${i}@example.com`,
      // Weighted enum (95% active, 5% blocked)
      status: { enum: ["active", "blocked"], weights: [95, 5] },
      // Date range
      created_at: { dateBetween: ["2024-01-01", "2025-12-31"] },
      // Constant value
      role: 'user'
    }
  },
  hooks: {
    beforeInsert: async (table, rows) => {
      console.log(`Seeding ${table}...`);
      return rows;
    }
  }
});
```

## CLI Reference

### `seed`
Seed the database with generated data.

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--db <url>` | Database connection string | - |
| `--dbType <type>` | Force database type (postgres, mysql, etc.) | Auto-inferred |
| `--all` | Seed all discovered tables | `true` |
| `--table <names...>` | Seed specific tables only | - |
| `--rows <n>` | Number of rows per table | `10` |
| `--seed <string>` | Fixed seed for deterministic data | Random |
| `--dry-run` | Preview changes without writing to DB | `false` |
| `--truncate` | Delete all data from tables before seeding | `false` |
| `--with-parents` | Automatically seed required parent tables | `false` |
| `--confirm <str>` | Require a confirmation string (for safety) | - |
| `--allow-production`| Allow running against production hosts | `false` |
| `--out <path>` | Output the seeding report to a JSON file | - |

### `reset`
Truncate all tables in the database. Useful for clearing data before a fresh seed or test run.

```bash
schema-seed reset --db "postgres://..."
```

| Flag | Description |
| :--- | :--- |
| `--db <url>` | Database connection string |
| `--allow-production`| Allow running against production hosts |

### `introspect`
Introspect the database schema and print it as a JSON object. This is useful for debugging or generating a schema snapshot.

```bash
schema-seed introspect --db "postgres://..." > schema.json
```

| Flag | Description |
| :--- | :--- |
| `--db <url>` | Database connection string |

## Safety Features

- **Production Detection**: The tool will refuse to run if the database host looks like a production environment (e.g., `aws.com`, `rds.com`) or if `NODE_ENV=production`, unless the `--allow-production` flag is provided.
- **Confirmation**: Use `--confirm "YES"` to force a manual confirmation step before seeding.

## License

MIT
