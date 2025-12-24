# schema-seed

## 0.1.16

### Patch Changes

- Updated MongoDB documentation
  - Added detailed `seed.config.ts` example for MongoDB
  - Documented CLI flags and commands specific to MongoDB
  - Explained features like references, truncation, and defaults
  - schema-seed-core@0.1.16
  - schema-seed-generators@0.1.16

## 0.1.15

### Patch Changes

- Updated dependencies
  - schema-seed-core@0.1.15
  - schema-seed-generators@0.1.15

## 0.1.14

### Patch Changes

- Updated dependencies
  - schema-seed-core@0.1.14
  - schema-seed-generators@0.1.14

## 0.1.13

### Patch Changes

- Fixed MongoDB truncation via CLI flag
  - Updated `runSeedMongo` to explicitly accept and check `truncate` in options
  - Updated CLI to pass `truncate` flag to MongoDB runner
  - Made `rows` optional in MongoDB config (defaults to 10)

- Updated dependencies
  - schema-seed-core@0.1.13
  - schema-seed-generators@0.1.13

## 0.1.12

### Patch Changes

- Fixed npm installation issues by removing workspace:\* dependencies
- Updated dependencies
  - schema-seed-core@0.1.12
  - schema-seed-generators@0.1.12

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

- Updated dependencies
  - schema-seed-core@0.1.11
  - schema-seed-generators@0.1.11

## 0.1.10

### Patch Changes

- 1c7b630: Fix bug where CLI options would overwrite config file values with undefined.
  - schema-seed-core@0.1.10
  - schema-seed-generators@0.1.10

## 0.1.9

### Patch Changes

- 4d43672: Fix logic for default rows count when not specified in config or flags.
- 4d43672: Update README with full installation commands for all adapters.
  - schema-seed-core@0.1.9
  - schema-seed-generators@0.1.9

## 0.1.8

### Patch Changes

- Fix critical bug where global CLI used outdated adapter loading logic.
  - Merged CLI logic into a single entry point to prevent duplicate/outdated code.
  - Verified adapter loading works for all databases in a local project environment.
  - Improved error handling and connection string detection.
  - schema-seed-core@0.1.8
  - schema-seed-generators@0.1.8

## 0.1.7

### Patch Changes

- Fix adapter loading by using createRequire to resolve paths from the current working directory.
  - Ensures global CLI can find locally installed adapters.
  - Uses pathToFileURL for ESM compatibility with absolute paths.
  - schema-seed-core@0.1.7
  - schema-seed-generators@0.1.7

## 0.1.6

### Patch Changes

- Fix adapter loading when CLI is installed globally.
  - CLI now correctly searches for adapters in the project's local node_modules.
  - Added support for both unscoped and scoped adapter names.
  - Improved error messages for missing adapters.
  - schema-seed-core@0.1.6
  - schema-seed-generators@0.1.6

## 0.1.5

### Patch Changes

- Improve CLI config loading and error messaging.
  - Added verbose logging when a config file is loaded.
  - Fixed an issue where CLI defaults would override config file values.
  - Improved error messages for missing database connection strings.
  - Added explicit error if a specified config file is not found.
  - schema-seed-core@0.1.5
  - schema-seed-generators@0.1.5

## 0.1.4

### Patch Changes

- Clean up README by removing internal maintenance sections.
- Enhance README with detailed database-specific examples and CLI reference.
- Updated dependencies
  - schema-seed-core@0.1.4
  - schema-seed-generators@0.1.4

## 0.1.3

### Patch Changes

- Clean up README by removing internal maintenance sections.
- Updated dependencies
  - schema-seed-core@0.1.3
  - schema-seed-generators@0.1.3

## 0.1.2

### Patch Changes

- Improve READMEs for all packages.
  - Main package now includes full documentation.
  - Adapters, core, and generators now have descriptive READMEs.
- Updated dependencies
  - schema-seed-core@0.1.2
  - schema-seed-generators@0.1.2

## 0.1.1

### Patch Changes

- Fix package names in READMEs and internal imports.
  - Updated README headings to match unscoped package names.
  - Fixed internal imports in CLI to use unscoped names.
  - Fixed dynamic adapter loading to use unscoped names.
- Updated dependencies
  - schema-seed-core@0.1.1
  - schema-seed-generators@0.1.1

## 0.1.0

### Minor Changes

- Initial public release v0.1.0
  - schema-first seeding
  - deterministic seed support
  - dynamic adapter loading
  - supports Postgres/MySQL/SQLite/SQLServer/Oracle/Mongo (config-based)

### Patch Changes

- Updated dependencies
  - schema-seed-core@0.1.0
  - schema-seed-generators@0.1.0
