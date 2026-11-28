import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const fileName = 'commercial-graph-permlist.json';
const source = new URL(`../../data/${fileName}`, import.meta.url);
const appId = '00000003-0000-0000-c000-000000000000';

export async function writeGraphManifest(directory, bytes) {
  const sourceBytes = bytes ?? await readFile(source);
  const configPath = join(directory, 'catalog-resources.json');
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, fileName), sourceBytes);
  await writeFile(configPath, JSON.stringify({ resources: [{
    appId, fileName, sha256: createHash('sha256').update(sourceBytes).digest('hex'), classification: { mode: 'graph' }
  }] }));
  return configPath;
}
