import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

const migrations=await readD1Migrations(fileURLToPath(new URL('./migrations',import.meta.url)));
export default defineConfig({
  plugins:[cloudflareTest({wrangler:{configPath:'./wrangler.jsonc'},remoteBindings:false,miniflare:{compatibilityDate:'2026-08-22',bindings:{TEST_MIGRATIONS:migrations,AI_PROVIDER_MODE:'mock'}}})],
  test:{include:['tests/**/*.test.ts'],setupFiles:['./tests/setup.ts'],testTimeout:30_000,hookTimeout:30_000,coverage:{reporter:['text','json','html']}},
});
