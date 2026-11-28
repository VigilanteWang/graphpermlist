import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
const directory = await mkdtemp(join(tmpdir(), 'graphpermlist-12-'));
const env = { ...process.env, SQLITE_PATH: join(directory, 'catalog.sqlite'),
  PORT: '3218', CORS_ORIGINS: 'http://127.0.0.1:5318', PERMISSIONS_CONFIG: '' };
let child;
try {
  // Fail before spawning if a service already answers on the verification port.
  await assert.rejects(fetch('http://127.0.0.1:3218/api/v1/health'));
  for (const command of ['migrate', 'import', 'import']) {
    const result = spawnSync(process.execPath, ['apps/api/dist/catalog-cli.js', command],
      { env, encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, result.stderr);
    console.log(`CLI ${command}: PASS`, result.stdout.trim());
  }
  child = spawn(process.execPath, ['apps/api/dist/main.js'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const origin = 'http://127.0.0.1:3218/api/v1';
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(child.exitCode, null, output);
    try { ready = (await fetch(`${origin}/health`)).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, output);
  const resourceId = '00000003-0000-0000-c000-000000000000';
  const base = `${origin}/resources/${resourceId}`;
  const read = async url => {
    const response = await fetch(url, { headers: { Origin: env.CORS_ORIGINS } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), env.CORS_ORIGINS);
    return response.json();
  };
  const resources = await read(`${origin}/resources`);
  assert.equal(resources.items[0].definitionCount, 1660);
  const all = await read(`${base}/permissions?showDisabled=true`);
  assert.equal(all.definitionCount, 1664);
  assert.equal(all.permissionCount, 1036);
  assert.equal(all.source.excludedRscCount, 60);
  assert.deepEqual(Object.keys(all.source).sort(), ['classificationVersion','excludedRscCount','fileName','importedAt','sha256']);
  assert.equal('artifact' in all, false);
  const categories = await read(`${base}/categories`);
  assert.equal(categories.definitionCount, 1660);
  assert.equal(categories.items.reduce((n,c) => n+c.definitionCount, 0), 1660);
  const mail = await read(`${base}/permissions/Mail.Read`);
  assert.deepEqual(mail.item.visibleTypes, ['Application', 'Delegated']);
  assert.equal(mail.allDefinitions.length, 2);
  const user = await read(`${base}/permissions/User.Read`);
  assert.deepEqual(user.item.visibleTypes, ['Delegated']);
  const guid = mail.allDefinitions.find(d => d.permissionType === 'Delegated').id;
  const detail = await read(`${base}/permissions/Mail.Read?q=${guid.toUpperCase()}`);
  assert.deepEqual(detail.item.visibleTypes, ['Delegated']);
  assert.equal(detail.allDefinitions.length, 2);
  assert.equal((await read(`${base}/permissions?permissionType=Application&adminConsentRequired=false`)).definitionCount, 0);
  assert.equal((await fetch(`${base}/permissions/Mail.Read?permissionType=Application&adminConsentRequired=false`)).status, 404);
  assert.equal((await fetch(`${base}/permissions?showDisabled=invalid`)).status, 400);
  assert.equal((await fetch(`${base}/permissions/missing-value`)).status, 404);
  const preflight = await fetch(`${origin}/resources`, { method: 'OPTIONS', headers: {
    Origin: env.CORS_ORIGINS, 'Access-Control-Request-Method': 'GET' } });
  assert.equal(preflight.status, 204);
  assert.equal(child.exitCode, null, output);
  assert.match(output, /Nest application successfully started/);
  console.log('HTTP standalone CommonJS process: PASS health/four routes/source shape/counts/GUID/consent/400/404/CORS/OPTIONS');
} finally {
  if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
  await rm(directory, { recursive: true, force: true });
  console.log('Verification process stopped and isolated database removed.');
}
