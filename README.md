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
npm install -g @alinazar-111/schema-seed
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
import { defineConfig } from '@alinazar-111/schema-seed';

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

## MongoDB Seeding (Config-Based)

`schema-seed` supports MongoDB seeding exclusively through a `seed.config.ts` file. Since MongoDB is schema-less, you must define the structure of the documents you want to generate.

### Example Configuration

```typescript
// seed.config.ts
import { defineConfig } from '@alinazar-111/schema-seed';

export default defineConfig({
  dbType: "mongodb",
  seed: 123, // Deterministic random seed
  // The seed option controls how random data is generated. When a seed value is provided (for example seed: 123), Schema-Seed will generate the same data every time you run the seeder with the same configuration. This makes database seeding deterministic and reproducible, which is especially useful for team environments, CI pipelines, debugging, and demos. Changing the seed value will produce a different, but still consistent, dataset. If no seed is provided, the generated data will be random on each run.
  mongodb: {
    uri: "mongodb://localhost:27017/appdb",

    collections: {
      users: {
        rows: 200,
        fields: {
          _id: "objectId",
          email: { type: "email", unique: true },
          firstName: "firstName",
          lastName: "lastName",
          age: { type: "int", min: 18, max: 65 },
          status: {
            type: "enum",
            values: ["active", "blocked"],
            weights: [95, 5]
          },
          profile: {
            type: "object",
            fields: {
              city: "city",
              country: "country"
            }
          },
          createdAt: {
            type: "dateBetween",
            from: "2024-01-01",
            to: "2025-12-31"
          }
        }
      },

      orders: {
        rows: 500,
        fields: {
          _id: "objectId",
          userId: { ref: "users._id" }, // Reference to another collection
          total: { type: "decimal", min: 5, max: 500 },
          createdAt: "dateRecent"
        }
      }
    }
  }
});
```

### Key Features

- **References**: Use `{ ref: "collection.field" }` to link documents across collections. `schema-seed` automatically calculates the correct insertion order.
- **Nested Objects**: Define complex structures using the `object` type and a nested `fields` map.
- **Arrays**: Use the `array` type with `of` to generate lists of values.
- **Deterministic**: Provide a `seed` at the top level to ensure the same data is generated every time.
- **Safety**: Production detection prevents accidental seeding of live databases unless `--allow-production` is used.


## Safety Features

- **Production Check**: Refuses to run if `NODE_ENV=production` or if the DB host looks like production. Use `--allow-production` to override.
- **Confirmation**: Require a typed string to proceed.
  ```bash
  schema-seed seed --db "postgres://prod-db/db" --allow-production --confirm "SEED_PROD"
  ```

## Supported Adapters

- `@alinazar-111/schema-seed-adapter-postgres`
- `@alinazar-111/schema-seed-adapter-mysql`
- `@alinazar-111/schema-seed-adapter-sqlite`
- `@alinazar-111/schema-seed-adapter-mssql`
- `@alinazar-111/schema-seed-adapter-oracle`
- `@alinazar-111/schema-seed-adapter-mongodb`

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to get involved.

## NPM Publishing

To publish packages via GitHub Actions, you must add an `NPM_TOKEN` to your GitHub repository secrets:
1. Generate an **Automation** token on [npmjs.com](https://www.npmjs.com/).
2. In your GitHub repo, go to **Settings > Secrets and variables > Actions**.
3. Add a new repository secret named `NPM_TOKEN` with your token value.

## Releasing (for Maintainers)

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

1. **Record changes**: Run `pnpm changeset` and follow the prompts.
2. **Version packages**: Run `pnpm version-packages` to bump versions and update changelogs.
3. **Verify**: Run `pnpm preflight:release` to build, test, and validate package contents.
4. **Publish**: Run `pnpm release` to push to NPM.

*Note: Scoped packages require public access on first publish. Changesets handles this via the config, but if prompted, use `--access public`.*

## License

MIT
