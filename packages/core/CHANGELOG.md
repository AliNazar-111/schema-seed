# schema-seed-core

## 0.1.16

## 0.1.15

### Patch Changes

- Fixed reference resolution in dry-run mode for MongoDB
  - Updated `runSeedMongo` to store generated IDs in reference registry even in dry-run mode
  - Ensures dependent collections can resolve foreign keys during dry-run

## 0.1.14

### Patch Changes

- Fixed `--rows` flag override for MongoDB
  - Updated `MongoSeedConfig` to include `rows` property
  - Updated `runSeedMongo` to respect global `rows` override from CLI

## 0.1.13

### Patch Changes

- Fixed MongoDB truncation via CLI flag
  - Updated `runSeedMongo` to explicitly accept and check `truncate` in options
  - Updated CLI to pass `truncate` flag to MongoDB runner
  - Made `rows` optional in MongoDB config (defaults to 10)

## 0.1.12

### Patch Changes

- Fixed npm installation issues by removing workspace:\* dependencies

## 0.1.11

### Patch Changes

- Fixed MongoDB truncation functionality and improved CLI
  - Added `truncate` support to `MongoSeedConfig` type
  - Implemented truncation logic in `runSeedMongo` to properly clear collections before seeding
  - Fixed TypeScript error in CLI config handling for `rows` option
  - Implemented `reset` command to truncate all tables/collections
  - Implemented `introspect` command to view database schema as JSON
  - Updated README with comprehensive CLI reference for all commands
  - Added logging for truncation operations

## 0.1.10

## 0.1.9

## 0.1.8

## 0.1.7

## 0.1.6

## 0.1.5

## 0.1.4

### Patch Changes

- Clean up README by removing internal maintenance sections.

## 0.1.3

### Patch Changes

- Clean up README by removing internal maintenance sections.

## 0.1.2

### Patch Changes

- Improve READMEs for all packages.
  - Main package now includes full documentation.
  - Adapters, core, and generators now have descriptive READMEs.

## 0.1.1

### Patch Changes

- Fix package names in READMEs and internal imports.
  - Updated README headings to match unscoped package names.
  - Fixed internal imports in CLI to use unscoped names.
  - Fixed dynamic adapter loading to use unscoped names.

## 0.1.0

### Minor Changes

- Initial public release v0.1.0
  - schema-first seeding
  - deterministic seed support
  - dynamic adapter loading
  - supports Postgres/MySQL/SQLite/SQLServer/Oracle/Mongo (config-based)
