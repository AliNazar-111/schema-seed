import { defineConfig } from 'tsup'

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        bin: 'src/bin.ts'
    },
    format: ['esm'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: true,
    shims: true,
    banner: {
        js: '#!/usr/bin/env node',
    },
    outExtension({ format }) {
        return {
            js: `.js`,
        }
    },
})
