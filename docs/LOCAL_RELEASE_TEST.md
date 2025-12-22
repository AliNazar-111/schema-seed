# Local Release Testing Guide

This guide explains how to test the entire release workflow locally without actually publishing any packages to NPM. This is highly recommended before performing your first official release.

## ⚠️ Warning: Do NOT Publish
This guide is for **testing purposes only**. Do not run `pnpm release` or `npm publish` during these steps.

---

## 1. Authentication Check
Ensure you are correctly authenticated with NPM, as some scripts might check for your identity.
```bash
npm whoami
```
If you are not logged in, run:
```bash
npm login
```

## 2. Create a Test Changeset
Simulate a new change by creating a dummy changeset.
```bash
pnpm changeset
```
- Select any package (e.g., `core`).
- Choose a `patch` bump.
- Enter a summary like "Local release test".
- **Result**: A new `.md` file will appear in the `.changeset/` directory.

## 3. Bump Versions Locally
Consume the changeset to update the `package.json` files and changelogs.
```bash
pnpm version-packages
```
- **Result**: You will see version numbers increment in all `package.json` files (due to fixed versioning) and new entries in `CHANGELOG.md` files.
- **Note**: You can discard these changes later using `git restore .` or `git checkout .`.

## 4. Run Preflight Checks
Execute the full validation suite to ensure the packages are built correctly and the tarballs are clean.
```bash
pnpm preflight:release
```
- This command builds all packages, runs tests, lints, and verifies that the generated tarballs only contain the intended files (dist, README, LICENSE).
- **Success**: You should see `✨ All packages verified successfully!`.

## 5. Verify the Built CLI
Test the built CLI directly from the `dist` folder to ensure dynamic adapter loading and shebangs are working.
```bash
node packages/cli/dist/bin.js --help
```

## 6. Simulate Installation (Optional)
If you want to see how the packages behave when "installed" in another project:

### Using NPM Link
1. In the root of this monorepo, link the CLI:
   ```bash
   cd packages/cli
   npm link
   ```
2. In a separate test folder:
   ```bash
   mkdir test-project && cd test-project
   npm init -y
   npm link @alinazar-111/schema-seed
   npx schema-seed --help
   ```

### Using Tarballs
You can install directly from the tarballs generated during the preflight check (if you modify the script to keep them, or run `npm pack` manually):
```bash
npm install ../schema-seed/packages/cli/alinazar-111-schema-seed-0.1.0.tgz
```

---

## 7. Cleanup
Once you are satisfied with the test, revert the version bumps and delete the dummy changeset:
```bash
git restore .
# If you committed the changeset, use:
# git reset --hard HEAD
```
