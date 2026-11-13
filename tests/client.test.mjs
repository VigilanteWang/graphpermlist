import test from 'node:test';
import assert from 'node:assert/strict';
import { createCatalogClient, CatalogApiError } from '../packages/api-client/dist/index.js';

test('client encodes route segments and false filters without sending credentials', async () => {
  const calls = [];
  const client = createCatalogClient('https://catalog.example/api/v1/', async (url, init) => {
    calls.push({ url, init });
    return Response.json({ items: [] });
  });
  const abort = new AbortController();
  await client.resources(abort.signal);
  await client.categories('id', { showDisabled: false });
  await client.permissions('id', { permissionType: 'Application', adminConsentRequired: false });
  await client.detail('id', 'Test/Scope.Read', { q: 'read & write' });
  assert.equal(calls[0].url, 'https://catalog.example/api/v1/resources');
  assert.equal(calls[0].init.signal, abort.signal);
  assert.equal(calls[0].init.credentials, 'omit');
  assert.match(calls[1].url, /showDisabled=false$/);
  assert.match(calls[2].url, /permissionType=Application&adminConsentRequired=false$/);
  assert.match(calls[3].url, /Test%2FScope.Read\?q=read\+%26\+write$/);
});

test('client preserves Nest HTTP errors and rejects network errors', async () => {
  const client = createCatalogClient('/api/v1', async () => Response.json({ statusCode: 400, message: ['Invalid boolean'], error: 'Bad Request' }, { status: 400 }));
  await assert.rejects(client.resources(), err => err instanceof CatalogApiError && err.status === 400 && err.message === 'Invalid boolean');
  const textClient = createCatalogClient('/api/v1', async () => new Response('Unavailable', { status: 503, statusText: 'Service Unavailable' }));
  await assert.rejects(textClient.resources(), err => err.status === 503);
  const offline = createCatalogClient('/api/v1', async () => { throw new TypeError('Offline'); });
  await assert.rejects(offline.resources(), /Offline/);
});


test('client keeps HTTP status when an intermediary sends malformed JSON errors', async () => {
  for (const body of [null, {}, [], { message: 42 }, { message: [] }]) {
    const client = createCatalogClient('/api/v1', async () => Response.json(body, { status: 502, statusText: 'Bad Gateway' }));
    await assert.rejects(client.resources(), err => err instanceof CatalogApiError && err.status === 502 && err.message === 'Bad Gateway');
  }
});
