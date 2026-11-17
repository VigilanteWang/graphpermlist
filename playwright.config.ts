import { defineConfig } from '@playwright/test';
const apiPort = Number(process.env.CATALOG_TEST_API_PORT ?? 3000);
const webPort = Number(process.env.CATALOG_TEST_WEB_PORT ?? 5173);
for (const port of [apiPort, webPort]) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Browser test ports must be integers between 1 and 65535');
}
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const webOrigin = `http://127.0.0.1:${webPort}`;
export default defineConfig({
  testDir: './tests/browser', workers: 1, use: { baseURL: webOrigin, headless: true },
  webServer: [
    { command: 'node tests/browser/start-api.mjs', url: `${apiOrigin}/api/v1/health`, env: { PORT: String(apiPort), SQLITE_PATH: ':memory:', CORS_ORIGINS: webOrigin }, reuseExistingServer: false },
    { command: `npm run dev -w @graph/web -- --port ${webPort} --strictPort`, url: webOrigin, env: { VITE_API_BASE_URL: `${apiOrigin}/api/v1` }, reuseExistingServer: false }
  ]
});
