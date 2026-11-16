import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', use: { baseURL: 'http://127.0.0.1:5173', headless: true },
  webServer: [
    { command: 'node tests/browser/start-api.mjs', url: 'http://127.0.0.1:3000/api/v1/health', env: { SQLITE_PATH: ':memory:', CORS_ORIGINS: 'http://127.0.0.1:5173' }, reuseExistingServer: false },
    { command: 'npm run dev -w @graph/web -- --port 5173 --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: false }
  ]
});
