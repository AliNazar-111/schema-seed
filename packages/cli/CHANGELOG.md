# schema-seed

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
