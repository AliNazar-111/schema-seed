# Release Process

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and publishing across the monorepo.

## Workflow

### 1. Create a Changeset
When you make a change that warrants a new version, run:
```bash
pnpm changeset
```
Follow the prompts to select the packages that changed and the type of version bump (major, minor, or patch). This will create a new markdown file in the `.changeset` directory. Commit this file.

### 2. Version Packages
When you are ready to release, run:
```bash
pnpm version-packages
```
This will:
- Consume the changeset files.
- Update the `package.json` versions.
- Update the internal dependency versions.
- Generate/update `CHANGELOG.md` files.

### 3. Build and Test
Ensure all packages are built and tested before publishing:
```bash
pnpm -r build && pnpm -r test && pnpm lint
```
Or use the workspace-wide scripts:
```bash
pnpm build:all && pnpm test:all && pnpm lint:all
```

### 4. Preflight Check
Before publishing, run the automated preflight script to build, test, lint, and verify the package contents:
```bash
pnpm preflight:release
```

### 5. Publish to NPM
Finally, publish the packages:
```bash
pnpm release
```
This runs `changeset publish`, which will publish any packages that have a version not yet on NPM.

## Internal Dependencies and Fixed Versioning

This monorepo is configured with **Fixed Versioning**. This means:
- All packages share the same version number.
- When one package is bumped (e.g., `core`), all other packages in the group are also bumped to maintain synchronization.
- **Internal Dependencies**: Changesets automatically handles the conversion of `workspace:*` dependencies to the actual version during the `version-packages` step. This ensures that the published packages reference specific, compatible versions of each other on NPM.

---

### Summary of Commands
- `pnpm changeset`: Declare a new change.
- `pnpm version-packages`: Bump versions and update changelogs.
- `pnpm build:all`: Build all packages.
- `pnpm test:all`: Run tests for all packages.
- `pnpm lint:all`: Lint all packages.
- `pnpm preflight:release`: Run all checks before release.
- `pnpm release`: Publish to NPM.
