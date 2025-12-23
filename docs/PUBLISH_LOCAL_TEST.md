# Local Publish Testing Guide

This guide explains how to verify the package structure and installation process locally before publishing to NPM.

## ⚠️ Warning: Do NOT Publish
This guide is for **testing only**. Do not run `npm publish` or `pnpm release` unless you are ready to make the packages public.

---

## 1. Preparation

### NPM Login
Ensure you are logged in to verify your credentials (though not strictly needed for packing).
```bash
npm login
```

### Build All Packages
Ensure all packages are built and the `dist/` directories are populated.
```bash
pnpm -r build
```

---

## 2. Generate Tarballs

To see exactly what will be uploaded to NPM, generate a tarball for each package:
```bash
pnpm pack:check
```
This runs `npm pack` in every package directory. You will see `.tgz` files appearing in each package folder (e.g., `packages/core/alinazar-111-schema-seed-core-0.0.1.tgz`).

---

## 3. Inspect Tarballs

You can inspect the contents of a tarball without installing it:
```bash
tar -tf packages/cli/alinazar-111-schema-seed-0.0.1.tgz
```
**Checklist:**
- [ ] Is the `dist/` folder present?
- [ ] Are `README.md` and `LICENSE` included?
- [ ] Are source files (`src/`) and tests (`*.test.ts`) excluded? (They should be if `files` in `package.json` is configured correctly).

---

## 4. Test CLI Locally

### Run directly from dist
You can test the built CLI without installing it:
```bash
node packages/cli/dist/bin.js --help
```

### Test with a local adapter
Since adapters are dynamically loaded, you can test the loading logic by pointing the CLI to a local build:
1. Go to an adapter directory: `cd packages/adapter-postgres`
2. Build it: `pnpm build`
3. Try to use it via the CLI.

---

## 5. Local Installation (Optional)

If you want to simulate a real installation in a separate project:

### Using NPM Link
1. In each package directory, run:
   ```bash
   npm link
   ```
2. In your test project, link the packages you need:
   ```bash
   npm link schema-seed
   npm link schema-seed-adapter-postgres
   ```

### Using Tarballs
You can install directly from the generated `.tgz` files:
```bash
npm install ./path/to/alinazar-111-schema-seed-0.0.1.tgz
```

---

## 6. Cleanup
Once you are done testing, remove the generated tarballs:
```bash
rm packages/*/*.tgz
```
