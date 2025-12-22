# Publish Checklist

Follow this checklist to ensure a safe and successful release of the `@alinazar-111/schema-seed` packages.

## 1. Authentication
- [ ] Ensure you are logged in to NPM with the correct account.
  ```bash
  npm whoami
  ```
  *Should output: `alinazar-111`*

## 2. Preflight Checks
- [ ] Run the automated preflight script. This builds, tests, lints, and verifies the contents of the package tarballs.
  ```bash
  pnpm preflight:release
  ```
  *Ensure it outputs: `✨ All packages verified successfully!`*

## 3. Versioning
- [ ] Create a changeset if you haven't already.
  ```bash
  pnpm changeset
  ```
- [ ] Bump versions and update changelogs.
  ```bash
  pnpm version-packages
  ```
- [ ] Commit the version changes and changelogs to `main`.

## 4. Publishing
- [ ] Publish the packages to NPM.
  ```bash
  pnpm release
  ```

## 5. Verification
- [ ] Verify the installation in a fresh folder.
  ```bash
  mkdir test-publish && cd test-publish
  npm init -y
  npm install @alinazar-111/schema-seed
  npx schema-seed --help
  ```

---

### ⚠️ Important Notes
- Heavy adapters (`oracle`, `mssql`) are dynamically loaded and should not be direct dependencies of the CLI.
- Ensure `NPM_TOKEN` is set in GitHub Secrets if using CI/CD for publishing.
