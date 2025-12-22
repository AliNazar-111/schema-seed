# Publish Checklist

Follow this checklist before every release to ensure a smooth and safe publishing process.

## 1. Pre-flight Checks
- [ ] **NPM Login**: Ensure you are logged in to the correct account.
  ```bash
  npm whoami
  ```
- [ ] **Full Build & Test**: Run the complete CI suite locally.
  ```bash
  pnpm -r build
  pnpm -r test
  pnpm lint
  ```

## 2. Package Inspection
- [ ] **Dry Run Pack**: Verify that only intended files are included in the tarball.
  ```bash
  pnpm pack:check
  ```
  *Check the generated `.tgz` files in each package directory. Ensure `dist/`, `README.md`, and `LICENSE` are present, and source files/tests are excluded.*

## 3. Versioning
- [ ] **Changeset**: Ensure all changes have been declared.
  ```bash
  pnpm changeset
  ```
- [ ] **Version Bump**: Consume changesets and update versions.
  ```bash
  pnpm version-packages
  ```

## 4. Publishing
- [ ] **Release**: Publish all updated packages to NPM.
  ```bash
  pnpm release
  ```

## 5. Post-Publish Verification
- [ ] **NPX Test**: Verify the CLI works directly from NPM (after a few minutes for propagation).
  ```bash
  npx @alinazar-111/schema-seed --help
  ```
- [ ] **Tagging**: Ensure the release is tagged in Git (Changesets does this automatically during `version`).
- [ ] **GitHub Release**: (Optional) Create a GitHub release from the tag.

---

### ⚠️ Dependency Note
The heavy adapters (`oracle` and `mssql`) are **not** included as direct dependencies of the CLI to keep the installation lightweight. Users must install them manually if needed:
```bash
npm install @alinazar-111/schema-seed-adapter-oracle
```
