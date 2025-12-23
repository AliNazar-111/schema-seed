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

| Database | Adapter Package | Connection String Example |
| :--- | :--- | :--- |
| **PostgreSQL** | `schema-seed-adapter-postgres` | `postgres://user:pass@localhost:5432/db` |
| **MySQL** | `schema-seed-adapter-mysql` | `mysql://user:pass@localhost:3306/db` |
| **SQLite** | `schema-seed-adapter-sqlite` | `sqlite://path/to/database.db` |
| **SQL Server** | `schema-seed-adapter-mssql` | `sqlserver://user:pass@localhost:1433?database=db` |
| **Oracle** | `schema-seed-adapter-oracle` | `oracle://user:pass@localhost:1521/service_name` |
| **MongoDB** | `schema-seed-adapter-mongodb` | `mongodb://localhost:27017/db` |

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
Since MongoDB is schema-less, you must define your collection structures in a `seed.config.ts` file.

```typescript
// seed.config.ts
import { defineConfig } from 'schema-seed';

export default defineConfig({
  dbType: "mongodb",
  mongodb: {
    uri: "mongodb://localhost:27017/appdb",
    collections: {
      users: {
        rows: 100,
        fields: {
          _id: "objectId",
          email: { type: "email", unique: true },
          name: "fullName",
          age: { type: "int", min: 18, max: 99 }
        }
      }
    }
  }
});
```
Then run:
```bash
schema-seed seed
```

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

## Safety Features

- **Production Detection**: The tool will refuse to run if the database host looks like a production environment (e.g., `aws.com`, `rds.com`) or if `NODE_ENV=production`, unless the `--allow-production` flag is provided.
- **Confirmation**: Use `--confirm "YES"` to force a manual confirmation step before seeding.

## License

MIT
