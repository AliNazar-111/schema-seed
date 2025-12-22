import { execSync } from 'node:child_process';
import { readdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const packagesDir = join(process.cwd(), 'packages');
const packages = readdirSync(packagesDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

let hasError = false;

for (const pkg of packages) {
    const pkgPath = join(packagesDir, pkg);
    const packageJsonPath = join(pkgPath, 'package.json');

    if (!existsSync(packageJsonPath)) continue;

    console.log(`\nChecking package: ${pkg}...`);

    try {
        // Run npm pack and get the filename
        const tarballName = execSync('npm pack --silent', { cwd: pkgPath }).toString().trim();
        const tarballPath = join(pkgPath, tarballName);

        // List files in tarball
        const files = execSync(`tar -tf ${tarballName}`, { cwd: pkgPath }).toString().split('\n').filter(Boolean);

        const allowedPrefixes = ['package/dist/', 'package/README.md', 'package/LICENSE', 'package/package.json'];
        const forbiddenPrefixes = ['package/src/', 'package/.env'];

        // Check for required files
        const hasDist = files.some(f => f.startsWith('package/dist/'));
        const hasReadme = files.includes('package/README.md');
        const hasLicense = files.includes('package/LICENSE');

        if (!hasDist) {
            console.error(`❌ ${pkg}: Missing dist/ folder in tarball`);
            hasError = true;
        }
        if (!hasReadme) {
            console.error(`❌ ${pkg}: Missing README.md in tarball`);
            hasError = true;
        }
        if (!hasLicense) {
            console.error(`❌ ${pkg}: Missing LICENSE in tarball`);
            hasError = true;
        }

        // Check for forbidden files
        const forbiddenFiles = files.filter(f => forbiddenPrefixes.some(p => f.startsWith(p)));
        if (forbiddenFiles.length > 0) {
            console.error(`❌ ${pkg}: Contains forbidden files: ${forbiddenFiles.join(', ')}`);
            hasError = true;
        }

        if (!hasError) {
            console.log(`✅ ${pkg}: Tarball looks good!`);
        }

        // Cleanup
        unlinkSync(tarballPath);
    } catch (err) {
        console.error(`❌ ${pkg}: Failed to pack or verify: ${err.message}`);
        hasError = true;
    }
}

if (hasError) {
    process.exit(1);
} else {
    console.log('\n✨ All packages verified successfully!');
}
