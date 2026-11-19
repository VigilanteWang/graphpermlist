import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as esmCore from '@graph/catalog-core';

const require = createRequire(import.meta.url);
const cjsCore = require('@graph/catalog-core');
const resourceId = '00000003-0000-0000-c000-000000000000';

// 小型人工数据独立于生产快照；每个文案字段使用独特词，防止搜索测试误命中其他字段。
function application(id, overrides = {}) {
  return { id, permissionType: 'Application', isEnabled: true,
    title: 'Application title marker', description: 'Application description marker',
    adminConsentRequired: true, adminConsentRule: 'application-always-required', ...overrides };
}
function delegated(id, overrides = {}) {
  return { id, permissionType: 'Delegated', isEnabled: true,
    title: 'Delegated title marker', description: 'Delegated description marker',
    adminConsentRequired: false, consentType: 'User', adminConsentRule: 'delegated-consent-type',
    userConsentTitle: 'User title searchtoken', userConsentDescription: 'User description uniquetoken',
    ...overrides };
}
const mailUser = delegated('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
const mailAppSecond = application('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const mailAppFirst = application('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const mailDisabled = delegated('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', {
  isEnabled: false, consentType: 'Admin', adminConsentRequired: true,
  title: 'Disabled delegated title', userConsentTitle: '', userConsentDescription: ''
});
const alpha = application('11111111-1111-4111-8111-111111111111');
const lower = application('22222222-2222-4222-8222-222222222222');
const disabled = application('33333333-3333-4333-8333-333333333333', { isEnabled: false });
const entry = (value, category, family, definition) => ({ value, category, family, definition });
const entries = [
  entry('alpha.Read', 'other', 'alpha', lower),
  entry('Mail.Read', 'mail', 'Mail', mailUser),
  entry('Mail.Read', 'mail', 'Mail', mailAppSecond),
  entry('Alpha.Read', 'other', 'Alpha', alpha),
  entry('Mail.Read', 'mail', 'Mail', mailAppFirst),
  entry('Mail.Read', 'mail', 'Mail', mailDisabled),
  entry('Disabled.Read', 'other', 'Disabled', disabled)
];
const categories = [
  { category: 'empty', displayName: 'Zero', description: 'No definitions' },
  { category: 'other', displayName: 'Zulu', description: 'Other permissions' },
  { category: 'mail', displayName: 'Alpha', description: 'Mail permissions' }
];
function row(value, category, family, visibleTypes, definitions) {
  return { resourceId, value, category, family, visibleTypes, definitions };
}
const mailRow = row('Mail.Read', 'mail', 'Mail', ['Application', 'Delegated'],
  [mailAppSecond, mailAppFirst, mailUser]);
const alphaRow = row('Alpha.Read', 'other', 'Alpha', ['Application'], [alpha]);
const lowerRow = row('alpha.Read', 'other', 'alpha', ['Application'], [lower]);
const disabledRow = row('Disabled.Read', 'other', 'Disabled', ['Application'], [disabled]);
const allMail = [mailAppSecond, mailAppFirst, mailUser, mailDisabled];
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

// 两个实际包出口各自断言固定预期；不能只比较彼此结果来证明查询正确。
for (const [format, core] of [['ESM', esmCore], ['CommonJS', cjsCore]]) {
  test(`${format}: default filtering, exact value merging and stable sorting`, () => {
    const rows = core.queryPermissions(resourceId, entries);
    assert.deepEqual(rows, [alphaRow, mailRow, lowerRow]);
    assert.deepEqual(core.countPermissions(rows), { permissionCount: 3, definitionCount: 5 });
    assert.deepEqual(core.queryPermissions(resourceId, entries, { showDisabled: true }), [
      alphaRow, disabledRow, { ...mailRow, definitions: allMail }, lowerRow
    ]);
    assert.deepEqual(core.countPermissions([]), { permissionCount: 0, definitionCount: 0 });
  });

  test(`${format}: permission type and consent filters match the same definition`, () => {
    assert.deepEqual(core.queryPermissions(resourceId, entries, {
      permissionType: 'Application', adminConsentRequired: false, showDisabled: true
    }), []);
    assert.deepEqual(core.queryPermissions(resourceId, entries, {
      permissionType: 'Delegated', adminConsentRequired: false
    }), [row('Mail.Read', 'mail', 'Mail', ['Delegated'], [mailUser])]);
    assert.deepEqual(core.queryPermissions(resourceId, entries, {
      permissionType: 'Delegated', adminConsentRequired: true
    }), []);
    assert.deepEqual(core.queryPermissions(resourceId, entries, {
      permissionType: 'Delegated', adminConsentRequired: true, showDisabled: true
    }), [row('Mail.Read', 'mail', 'Mail', ['Delegated'], [mailDisabled])]);
    assert.deepEqual(core.queryPermissions(resourceId, entries, {
      q: mailUser.id, permissionType: 'Application'
    }), []);
    assert.deepEqual(core.queryPermissions(resourceId, entries, {
      q: mailUser.id, adminConsentRequired: true
    }), []);
  });

  test(`${format}: GUID and consent text searches are trimmed and case insensitive`, () => {
    for (const q of [`  ${mailUser.id.toUpperCase()}  `, ' SEARCHTOKEN ', ' UNIQUETOKEN ',
      ' DELEGATED TITLE MARKER ', ' DELEGATED DESCRIPTION MARKER ']) {
      assert.deepEqual(core.queryPermissions(resourceId, entries, { q }),
        [row('Mail.Read', 'mail', 'Mail', ['Delegated'], [mailUser])], q);
    }
    for (const q of ['APPLICATION TITLE MARKER', 'APPLICATION DESCRIPTION MARKER']) {
      assert.deepEqual(core.queryPermissions(resourceId, entries, { q }), [alphaRow,
        row('Mail.Read', 'mail', 'Mail', ['Application'], [mailAppSecond, mailAppFirst]), lowerRow]);
    }
    assert.deepEqual(core.queryPermissions(resourceId, entries, { q: '  mAiL.ReAd  ' }), [mailRow]);
    assert.deepEqual(core.queryPermissions(resourceId, entries, { q: '  ' }), [alphaRow, mailRow, lowerRow]);
    assert.deepEqual(core.queryPermissions(resourceId, entries, { q: mailDisabled.id }), []);
    assert.deepEqual(core.queryPermissions(resourceId, entries, { q: mailDisabled.id, showDisabled: true }),
      [row('Mail.Read', 'mail', 'Mail', ['Delegated'], [mailDisabled])]);
    for (const q of ['not-present', '%', '_', "' OR 1=1 --"]) {
      assert.deepEqual(core.queryPermissions(resourceId, entries, { q }), [], q);
    }
  });

  test(`${format}: category and family filtering and visible-definition counts`, () => {
    assert.deepEqual(core.queryPermissions(resourceId, entries, { category: 'mail', family: 'Mail' }), [mailRow]);
    assert.deepEqual(core.queryPermissions(resourceId, entries, { category: 'other', family: 'Mail' }), []);
    assert.deepEqual(core.queryPermissions(resourceId, entries, { family: 'Alpha' }), [alphaRow]);
    assert.deepEqual(core.queryPermissions(resourceId, entries, { family: 'alpha' }), [lowerRow]);
    assert.deepEqual(core.queryPermissions(resourceId, entries, { category: 'unknown' }), []);
    assert.deepEqual(core.queryCategories(categories, [alphaRow, mailRow, lowerRow]), [
      { ...categories[2], permissionCount: 1, definitionCount: 3 },
      { ...categories[1], permissionCount: 2, definitionCount: 2 }
    ]);
    assert.deepEqual(core.queryCategories(categories, []), []);
    const delegatedOnly = core.queryPermissions(resourceId, entries, { permissionType: 'Delegated' });
    assert.deepEqual(core.countPermissions(delegatedOnly), { permissionCount: 1, definitionCount: 1 });
    assert.deepEqual(core.queryCategories(categories, delegatedOnly), [
      { ...categories[2], permissionCount: 1, definitionCount: 1 }
    ]);
  });

  test(`${format}: detail preserves every definition while respecting current visibility`, () => {
    assert.deepEqual(core.queryDetail(resourceId, entries, 'Mail.Read'), { item: mailRow, allDefinitions: allMail });
    assert.deepEqual(core.queryDetail(resourceId, entries, 'Mail.Read', { q: mailUser.id }), {
      item: row('Mail.Read', 'mail', 'Mail', ['Delegated'], [mailUser]), allDefinitions: allMail
    });
    assert.deepEqual(core.queryDetail(resourceId, entries, 'Mail.Read', { permissionType: 'Application' }), {
      item: row('Mail.Read', 'mail', 'Mail', ['Application'], [mailAppSecond, mailAppFirst]), allDefinitions: allMail
    });
    assert.deepEqual(core.queryDetail(resourceId, entries, 'Disabled.Read', { showDisabled: true }), {
      item: disabledRow, allDefinitions: [disabled]
    });
    assert.deepEqual(core.queryDetail(resourceId, entries, 'Alpha.Read'), { item: alphaRow, allDefinitions: [alpha] });
    assert.deepEqual(core.queryDetail(resourceId, entries, 'alpha.Read'), { item: lowerRow, allDefinitions: [lower] });
    for (const [value, query] of [['mail.read', {}], ['missing', {}], ['Disabled.Read', {}],
      ['Mail.Read', { q: 'absent' }], ['Mail.Read', { category: 'other' }],
      ['Mail.Read', { permissionType: 'Application', adminConsentRequired: false }]]) {
      assert.equal(core.queryDetail(resourceId, entries, value, query), undefined);
    }
  });

  test(`${format}: all operations accept deeply frozen inputs without mutation`, () => {
    const frozenEntries = deepFreeze(structuredClone(entries));
    const frozenCategories = deepFreeze(structuredClone(categories));
    const frozenRows = deepFreeze(structuredClone([alphaRow, mailRow, lowerRow]));
    const query = deepFreeze({ q: ' Mail.Read ', showDisabled: true });
    assert.deepEqual(core.queryPermissions(resourceId, frozenEntries, query), [{ ...mailRow, definitions: allMail }]);
    assert.deepEqual(core.queryDetail(resourceId, frozenEntries, 'Mail.Read', query), {
      item: { ...mailRow, definitions: allMail }, allDefinitions: allMail
    });
    assert.deepEqual(core.countPermissions(frozenRows), { permissionCount: 3, definitionCount: 5 });
    assert.equal(core.queryCategories(frozenCategories, frozenRows)[0].definitionCount, 3);
    assert.deepEqual(frozenEntries, entries);
    assert.deepEqual(frozenCategories, categories);
    assert.deepEqual(frozenRows, [alphaRow, mailRow, lowerRow]);
    assert.deepEqual(query, { q: ' Mail.Read ', showDisabled: true });
  });
}
