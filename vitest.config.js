import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({
    resolve: {
        alias: {
            '@projectwallace/format-css': resolve('./src/lib/index.ts'),
        },
    },
    test: {
        coverage: {
            provider: 'v8',
        },
    },
});
