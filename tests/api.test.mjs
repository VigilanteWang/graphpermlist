import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
process.env.SQLITE_PATH = ':memory:';
const { Test } = require('@nestjs/testing');
const { DataSource } = require('typeorm');
const { AppModule } = require('../apps/api/dist/app.module.js');
const { configureApp } = require('../apps/api/dist/bootstrap.js');
const { CatalogService } = require('../apps/api/dist/catalog/catalog.service.js');
const { PermissionQueryDto } = require('../apps/api/dist/catalog/permission-query.dto.js');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');

const graph = '00000003-0000-0000-c000-000000000000';

test('Nest resolves modules and real SQLite driver; four catalog routes honor unimported state after explicit migration', async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  try {
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    assert.equal(app.get(DataSource).options.synchronize, false);
    assert.deepEqual(await app.get(DataSource).query('SELECT 1 AS loaded'), [{ loaded: 1 }]);
    assert.deepEqual(await app.get(DataSource).query("SELECT name FROM sqlite_master WHERE type='table'"), []);
    await app.get(DataSource).runMigrations();
    assert.deepEqual(await app.get(DataSource).runMigrations(), [], 'migration is repeatable');
    const health = await fetch(`${base}/api/v1/health`);
    assert.equal(health.status, 200);
    const response = await fetch(`${base}/api/v1/resources`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.deepEqual(await response.json(), { dataState: 'not-imported', source: null, items: [] });
    for (const query of ['unknown=true', 'q=a&q=b', 'q=anything']) {
      assert.equal((await fetch(`${base}/api/v1/resources?${query}`)).status, 400);
    }
    const disallowed = await fetch(`${base}/api/v1/resources`, { headers: { Origin: 'https://unlisted.example' } });
    assert.equal(disallowed.headers.get('access-control-allow-origin'), null);
    for (const path of [`resources/${graph}/categories`, `resources/${graph}/permissions`, `resources/${graph}/permissions/Mail.Read`]) {
      assert.equal((await fetch(`${base}/api/v1/${path}?showDisabled=false`)).status, 404);
      for (const query of ['showDisabled=1','showDisabled=','adminConsentRequired=no','permissionType=application','q=a&q=b','unknown=true']) {
        const invalid = await fetch(`${base}/api/v1/${path}?${query}`);
        assert.equal(invalid.status, 400, `${path}?${query}`);
        assert.equal((await invalid.json()).statusCode, 400);
      }
    }
    assert.equal((await fetch(`${base}/api/v1/resources/not-an-app-id/permissions`)).status, 400);
    assert.equal((await fetch(`${base}/api/v1/resources/${graph}/permissions?q=${'a'.repeat(501)}`)).status, 400);
    // Default Nest exception handling must not expose service/database exceptions.
    app.get(CatalogService).resources = () => { throw new Error('private database path secret'); };
    const failure = await fetch(`${base}/api/v1/resources`);
    assert.equal(failure.status, 500);
    const body = await failure.text();
    assert.ok(!body.includes('private database'));
    assert.ok(body.includes('Internal server error'));
  } finally { await app.close(); }
  assert.equal(module.get(DataSource).isInitialized, false, 'Nest closes the driver connection');
});

test('boolean query strings remain false; invalid and repeated inputs fail validation', () => {
  const dto = plainToInstance(PermissionQueryDto, { showDisabled: 'false', adminConsentRequired: 'false' });
  assert.equal(dto.showDisabled, false);
  assert.equal(dto.adminConsentRequired, false);
  assert.equal(validateSync(dto).length, 0);
  assert.ok(validateSync(plainToInstance(PermissionQueryDto, { showDisabled: ['true', 'false'] })).length);
});
