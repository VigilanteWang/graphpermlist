import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
process.env.SQLITE_PATH = ':memory:';
const { Test } = require('@nestjs/testing');
const { ConfigService } = require('@nestjs/config');
const { DataSource } = require('typeorm');
const { AppModule } = require('../apps/api/dist/app.module.js');
const { validateEnvironment } = require('../apps/api/dist/configuration.js');
const { configureApp } = require('../apps/api/dist/bootstrap.js');
const { CatalogService } = require('../apps/api/dist/catalog/catalog.service.js');
const { CatalogImportService } = require('../apps/api/dist/catalog/catalog-import.service.js');
const { CatalogImport, CatalogDefinition } = require('../apps/api/dist/catalog/catalog.entities.js');
const { classifyPermission, CATEGORIES } = require('../apps/api/dist/catalog/classification.js');
const graph = '00000003-0000-0000-c000-000000000000';
const source = JSON.parse(await readFile(new URL('../data/commercial-graph-permlist.json', import.meta.url), 'utf8'));

function wire(raw, permissionType) {
  const base = { id: raw.id.toLowerCase(), isEnabled: raw.isEnabled,
    title: permissionType === 'Application' ? raw.displayName : raw.adminConsentDisplayName,
    description: permissionType === 'Application' ? raw.description : raw.adminConsentDescription };
  return permissionType === 'Application'
    ? { ...base, permissionType, adminConsentRequired: true, adminConsentRule: 'application-always-required' }
    : { ...base, permissionType, adminConsentRequired: raw.type === 'Admin', consentType: raw.type,
      userConsentTitle: raw.userConsentDisplayName, userConsentDescription: raw.userConsentDescription,
      adminConsentRule: 'delegated-consent-type' };
}
const expected = [
  ...source.appRoles.filter(d => d.allowedMemberTypes.includes('Application')).map(d => ({ value: d.value, ...wire(d, 'Application') })),
  ...source.oauth2PermissionScopes.map(d => ({ value: d.value, ...wire(d, 'Delegated') }))
];

async function setup() {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService).useValue(new ConfigService(validateEnvironment({SQLITE_PATH:':memory:'}))).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.get(DataSource).runMigrations();
  await app.listen(0, '127.0.0.1');
  return { app, database: app.get(DataSource), importer: app.get(CatalogImportService),
    config: app.get(ConfigService), base: `${await app.getUrl()}/api/v1/resources/${graph}` };
}

// Independent oracle derives search/consent/enabled semantics directly from official fields.
function oracle(query) {
  return expected.filter(d => {
    if (!query.showDisabled && !d.isEnabled) return false;
    if (query.permissionType && d.permissionType !== query.permissionType) return false;
    if (query.adminConsentRequired !== undefined && d.adminConsentRequired !== query.adminConsentRequired) return false;
    if (query.category && classifyPermission(d.value).category !== query.category) return false;
    if (query.family && classifyPermission(d.value).family !== query.family) return false;
    const q = query.q?.trim().toLowerCase();
    return !q || [d.value, d.id, d.title, d.description, d.userConsentTitle ?? '', d.userConsentDescription ?? '']
      .some(value => value.toLowerCase().includes(q));
  });
}
function keys(definitions) { return definitions.map(d => `${d.permissionType}/${d.id}`).sort(); }

test('real snapshot, four HTTP APIs, matching definitions and consistent filtered counts', async t => {
  const { app, database, importer, base } = await setup();
  const get = async (path, query = {}) => {
    const response = await fetch(`${base}${path}?${new URLSearchParams(Object.entries(query).map(([k,v]) => [k,String(v)]))}`);
    assert.equal(response.status, 200, path);
    return response.json();
  };
  try {
    await t.test('import preserves all ordinary fields and excludes RSC', async () => {
      const imported = await importer.importFile();
      assert.equal(imported.reused, false);
      assert.equal(imported.definitionCount, 1664);
      const all = await get('/permissions', { showDisabled: true });
      assert.equal(all.definitionCount, 1664);
      assert.equal(all.permissionCount, 1036);
      assert.equal(all.source.excludedRscCount, 60);
      assert.equal(all.source.fileName, 'commercial-graph-permlist.json');
      assert.ok(!JSON.stringify(all.source).includes(process.cwd()));
      assert.equal(all.source.sha256, 'd566bed3c4d7a4cf09ec54d35c25aee7b232df5b46c765af7a377dd9fe0b96a0');
      assert.ok(!Number.isNaN(Date.parse(all.source.importedAt)));
      const actual = all.items.flatMap(row => row.definitions.map(d => ({ value: row.value, ...d })));
      assert.deepEqual(actual.sort((a,b) => `${a.value}/${a.permissionType}`.localeCompare(`${b.value}/${b.permissionType}`)),
        [...expected].sort((a,b) => `${a.value}/${a.permissionType}`.localeCompare(`${b.value}/${b.permissionType}`)));
      const raw = await database.getRepository(CatalogDefinition).find();
      for (const entry of raw) {
        const original = (entry.permissionType === 'Application' ? source.appRoles : source.oauth2PermissionScopes).find(d => d.id === entry.id);
        assert.deepEqual(entry.rawDefinition, original);
      }
      assert.equal(raw.length, 1664);
      assert.ok(source.resourceSpecificApplicationPermissions.every(rsc => !raw.some(d => d.id === rsc.id)));
      const resourceResponse = await fetch(base.split(`/${graph}`)[0]);
      const resources = await resourceResponse.json();
      assert.equal(resources.items.length, 1);
      assert.equal(resources.items[0].resourceId, graph);
      assert.equal(resources.items[0].definitionCount, 1660);
      assert.deepEqual(await importer.importFile(), { ...imported, reused: true });
      assert.equal(await database.getRepository(CatalogImport).count(), 1);
    });

    await t.test('Mail.Read and User.Read merge correctly; details retain both GUIDs', async () => {
      const user = await get('/permissions/User.Read');
      assert.deepEqual(user.item.visibleTypes, ['Delegated']);
      assert.equal(user.allDefinitions.length, 1);
      const mail = await get('/permissions/Mail.Read');
      assert.deepEqual(mail.item.visibleTypes, ['Application', 'Delegated']);
      assert.equal(mail.allDefinitions.length, 2);
      assert.equal(mail.item.definitions.find(d => d.permissionType === 'Application').adminConsentRequired, true);
      assert.equal(mail.item.definitions.find(d => d.permissionType === 'Delegated').adminConsentRequired, false);
      const delegated = mail.allDefinitions.find(d => d.permissionType === 'Delegated');
      const byGuid = await get('/permissions/Mail.Read', { q: delegated.id.toUpperCase() });
      assert.deepEqual(byGuid.item.visibleTypes, ['Delegated']);
      assert.deepEqual(byGuid.allDefinitions, mail.allDefinitions);
      const byType = await get('/permissions/Mail.Read', { permissionType: 'Application' });
      assert.deepEqual(byType.item.visibleTypes, ['Application']);
      assert.deepEqual(byType.allDefinitions, mail.allDefinitions);
      assert.equal((await get('/permissions', { permissionType: 'Application', adminConsentRequired: false })).definitionCount, 0);
    });

    await t.test('filters, all search fields and category totals match an independent oracle', async () => {
      const queries = [{}, {showDisabled: false}, {showDisabled: true}, {q:'  mAiL.rEaD  '},
        {q:'no-such-permission-xyz'}, {q:'%'}, {q:'_'}, {q:"' OR 1=1 --"}, {family:'Mail'},
        {family:'OpenID permissions'}, {family:'User-LifeCycleInfo'}, {category:'unknown-category'},
        {permissionType:'Delegated',adminConsentRequired:false}, {permissionType:'Delegated',adminConsentRequired:true},
        {permissionType:'Application',adminConsentRequired:false}, {permissionType:'Application',adminConsentRequired:true},
        ...CATEGORIES.map(c => ({category:c.category,showDisabled:true})),
        ...['Application','Delegated'].flatMap(permissionType => expected.filter(d => d.permissionType === permissionType).slice(0,2)
          .flatMap(d => [d.id,d.title,d.description,...(permissionType === 'Delegated' ? [d.userConsentTitle,d.userConsentDescription] : [])]
            .filter(Boolean).map(q => ({q:q.toUpperCase(),permissionType}))))];
      for (const query of queries) {
        const list = await get('/permissions', query);
        const categories = await get('/categories', query);
        const matches = oracle(query);
        assert.deepEqual(keys(list.items.flatMap(row => row.definitions)), keys(matches), JSON.stringify(query));
        assert.equal(list.definitionCount, matches.length);
        assert.equal(list.permissionCount, new Set(matches.map(d => d.value)).size);
        assert.equal(categories.definitionCount, list.definitionCount);
        assert.equal(categories.permissionCount, list.permissionCount);
        assert.equal(categories.items.reduce((n,c) => n+c.definitionCount,0), list.definitionCount);
        assert.equal(categories.items.reduce((n,c) => n+c.permissionCount,0), list.permissionCount);
        for (const c of categories.items) {
          const rows = list.items.filter(row => row.category === c.category);
          assert.equal(c.permissionCount, rows.length);
          assert.equal(c.definitionCount, rows.flatMap(row => row.definitions).length);
        }
        for (const row of list.items) assert.deepEqual(row.visibleTypes, [...new Set(row.definitions.map(d => d.permissionType))]);
      }
    });

    await t.test('disabled-only values, no matches and unknown/case-sensitive routes', async () => {
      for (const disabled of expected.filter(d => !d.isEnabled)) {
        const detail = await get(`/permissions/${encodeURIComponent(disabled.value)}`, {showDisabled:true});
        assert.ok(detail.allDefinitions.some(d => d.id === disabled.id && !d.isEnabled));
        const list = await get('/permissions', {q:disabled.id,showDisabled:false});
        assert.equal(list.definitionCount,0);
        assert.equal((await fetch(`${base}/permissions/${encodeURIComponent(disabled.value)}?q=${disabled.id}`)).status,404);
      }
      for (const path of ['/permissions/no-such-value','/permissions/mail.read','/permissions/Mail.Read?permissionType=Application&adminConsentRequired=false']) {
        assert.equal((await fetch(`${base}${path}`)).status,404);
      }
      assert.equal((await fetch(base.replace(graph,'11111111-1111-4111-8111-111111111111')+'/categories')).status,404);
      assert.equal((await get('/permissions',{q:'nonexistent-xyz'})).dataState,'ready');
      assert.equal((await get('/permissions',{q:'nonexistent-xyz'})).source.sha256.length,64);
    });
  } finally { await app.close(); }
  assert.equal(database.isInitialized,false);
});

test('transactional publication, updated versions, corrupt input, rollback after partial writes and concurrency', async () => {
  const dir = await mkdtemp(join(tmpdir(),'catalog-transaction-'));
  const { app, database, importer, config } = await setup();
  const catalog = app.get(CatalogService);
  try {
    const first = await importer.importFile();
    const initial = await catalog.permissions(graph,{showDisabled:true});
    const snapshotTables = async () => Object.fromEntries(await Promise.all(
      ['catalog_import','catalog_category','catalog_family','catalog_definition'].map(async table =>
        [table,(await database.query(`SELECT COUNT(*) AS n FROM ${table}`))[0].n])));
    const before = await snapshotTables();
    const badPath = join(dir,'invalid.json');
    config.set('PERMISSIONS_SOURCE',badPath);
    for (const invalid of ['{broken', JSON.stringify({...source,appRoles:[]}),
      JSON.stringify({...source,appRoles:[...source.appRoles,source.appRoles[0]]}),
      JSON.stringify({...source,passwordCredentials:[]})]) {
      await writeFile(badPath,invalid);
      await assert.rejects(importer.importFile());
      assert.deepEqual(await snapshotTables(),before);
      assert.deepEqual(await catalog.permissions(graph,{showDisabled:true}),initial);
    }
    const changed = structuredClone(source);
    const newRole = {...changed.appRoles[0], id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',value:'NewUnknownFamily.Read.All',isEnabled:true};
    changed.appRoles.push(newRole);
    // Distinct GUIDs of one type with the same value must both survive merging.
    changed.appRoles.push({...newRole,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'});
    // A valid user/group-only app role is excluded from the ordinary application catalog.
    changed.appRoles.push({...newRole,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',value:'UsersOnly.Read',allowedMemberTypes:['User']});
    // One type disabled while the other stays enabled; detail must preserve both.
    changed.oauth2PermissionScopes.find(d => d.value === 'Mail.Read').isEnabled = false;
    await writeFile(badPath,JSON.stringify(changed));
    await database.query(`CREATE TRIGGER fail_definition BEFORE INSERT ON catalog_definition WHEN NEW.value = 'NewUnknownFamily.Read.All' BEGIN SELECT RAISE(ABORT,'injected middle-of-import failure'); END`);
    await assert.rejects(importer.importFile(),/injected middle-of-import failure/);
    assert.deepEqual(await snapshotTables(),before);
    assert.deepEqual(await catalog.permissions(graph,{showDisabled:true}),initial);
    await database.query('DROP TRIGGER fail_definition');
    // Fail after deactivating the old version; the previous active pointer must roll back.
    await database.query(`CREATE TRIGGER fail_publish BEFORE UPDATE OF active ON catalog_import WHEN NEW.active = 1 BEGIN SELECT RAISE(ABORT,'injected publication failure'); END`);
    await assert.rejects(importer.importFile(),/injected publication failure/);
    assert.deepEqual(await snapshotTables(),before);
    assert.deepEqual(await catalog.permissions(graph,{showDisabled:true}),initial);
    await database.query('DROP TRIGGER fail_publish');
    const [updated,duplicate] = await Promise.all([importer.importFile(),importer.importFile()]);
    assert.notEqual(updated.versionId,first.versionId);
    assert.equal(updated.definitionCount,1666);
    assert.equal(updated.reused,false);
    assert.deepEqual(duplicate,{...updated,reused:true});
    assert.equal(await database.getRepository(CatalogImport).count(),2);
    assert.equal(await database.getRepository(CatalogImport).countBy({active:true}),1);
    const current = await catalog.permissions(graph,{showDisabled:true});
    assert.notEqual(current.source.sha256,initial.source.sha256);
    assert.equal(current.definitionCount,1666);
    assert.equal(current.permissionCount,1037);
    assert.equal(current.items.find(d => d.value === newRole.value).category,'uncategorized');
    assert.equal(current.items.find(d => d.value === newRole.value).definitions.length,2);
    assert.deepEqual(current.items.find(d => d.value === newRole.value).visibleTypes,['Application']);
    assert.ok(!current.items.some(d => d.value === 'UsersOnly.Read'));
    const mail = await catalog.detail(graph,'Mail.Read',{});
    assert.deepEqual(mail.item.visibleTypes,['Application']);
    assert.equal(mail.allDefinitions.length,2);
    assert.equal(mail.allDefinitions.find(d => d.permissionType === 'Delegated').isEnabled,false);
    assert.equal(await database.getRepository(CatalogDefinition).countBy({versionId:first.versionId}),1664);
    // Schema constraints reject duplicate definition identity and category/family drift.
    const row = await database.getRepository(CatalogDefinition).findOneByOrFail({versionId:updated.versionId});
    await assert.rejects(database.getRepository(CatalogDefinition).insert(row), /UNIQUE/);
    await assert.rejects(database.query(`UPDATE catalog_definition SET family='MissingFamily' WHERE versionId=? AND id=?`,[updated.versionId,row.id]),/FOREIGN KEY/);
  } finally { await app.close(); await rm(dir,{recursive:true,force:true}); }
});

test('CLI initializes, imports and closes on success/failure; separate HTTP context reads persisted database', async () => {
  const dir = await mkdtemp(join(tmpdir(),'catalog-cli-'));
  const path = join(dir,'catalog.sqlite');
  const env = {...process.env,SQLITE_PATH:path,PORT:'1'};
  delete env.PERMISSIONS_SOURCE;
  delete env.PERMISSIONS_SHA256;
  const run = (command,extra={}) => spawnSync(process.execPath,['apps/api/dist/catalog-cli.js',command],{
    env:{...env,...extra},encoding:'utf8',timeout:15000});
  let app;
  try {
    const migrate = run('migrate');
    assert.equal(migrate.status,0,migrate.stderr);
    assert.match(migrate.stdout,/CatalogSchema/);
    const initial = run('import');
    assert.equal(initial.status,0,initial.stderr);
    assert.match(initial.stdout,/"definitionCount":1664/);
    const duplicate = run('import');
    assert.equal(duplicate.status,0,duplicate.stderr);
    assert.match(duplicate.stdout,/"reused":true/);
    const failure = run('import',{PERMISSIONS_SOURCE:join(dir,'operator-private-name.json')});
    assert.equal(failure.status,1);
    assert.equal(failure.signal,null);
    assert.ok(!(failure.stdout+failure.stderr).includes('operator-private-name'));
    const invalidDatabase = run('migrate',{SQLITE_PATH:'/dev/null/operator-private-name/catalog.sqlite'});
    assert.equal(invalidDatabase.status,1);
    assert.ok(!(invalidDatabase.stdout+invalidDatabase.stderr).includes('operator-private-name'));
    assert.ok(!(invalidDatabase.stdout+invalidDatabase.stderr).includes(process.cwd()));
    assert.match(invalidDatabase.stderr,/Catalog command failed/);
    process.env.SQLITE_PATH=path;
    const module = await Test.createTestingModule({imports:[AppModule]})
      .overrideProvider(ConfigService).useValue(new ConfigService(validateEnvironment({SQLITE_PATH:path}))).compile();
    app=module.createNestApplication({logger:false});
    configureApp(app);
    await app.listen(0,'127.0.0.1');
    const response=await fetch(`${await app.getUrl()}/api/v1/resources/${graph}/permissions`);
    assert.equal(response.status,200);
    assert.equal((await response.json()).definitionCount,1660);
    const versions=await app.get(DataSource).getRepository(CatalogImport).count();
    assert.equal(versions,1);
  } finally {
    process.env.SQLITE_PATH=':memory:';
    await app?.close();
    await rm(dir,{recursive:true,force:true});
  }
});

test('classification exact overrides, OIDC, complete prefixes and conservative fallback', () => {
  assert.deepEqual(classifyPermission('RoleManagement.Read.Exchange'),{category:'exchange',family:'RoleManagement'});
  assert.equal(classifyPermission('RoleManagement.Read.Directory').category,'entra');
  assert.equal(classifyPermission('Group.ManageProtection.All').category,'security-compliance');
  for (const value of ['openid','profile','email','offline_access']) {
    assert.deepEqual(classifyPermission(value),{category:'openid',family:'OpenID permissions'});
  }
  assert.equal(classifyPermission('User-LifeCycleInfo.Read.All').family,'User-LifeCycleInfo');
  for (const value of ['MailUnknown.Read','mail.Read','constructor.Read','toString']) assert.equal(classifyPermission(value).category,'uncategorized');
  const categories=new Set(CATEGORIES.map(c => c.category));
  for (const d of expected) assert.ok(categories.has(classifyPermission(d.value).category));
});
