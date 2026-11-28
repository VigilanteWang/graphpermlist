import { createHash } from 'node:crypto';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const verificationId = 'aaaaaaaa-0000-4000-8000-000000000004';
export const sourceDigest = bytes => createHash('sha256').update(bytes).digest('hex');

export async function addVerificationResource(output) {
  const dataDir = new URL('../../data/', import.meta.url);
  const config = JSON.parse(await readFile(new URL('catalog-resources.json', dataDir), 'utf8'));
  await Promise.all(config.resources.map(({ fileName }) => copyFile(new URL(fileName, dataDir), join(output, fileName))));
  const role = (value, suffix) => ({
    allowedMemberTypes: ['Application'], description: `Synthetic description for ${value}.`,
    displayName: `Synthetic ${value}`, id: `bbbbbbbb-0000-4000-8000-00000000000${suffix}`,
    isEnabled: true, origin: 'Application', value
  });
  const displayName = 'Verification Resource';
  const source = {
    appId: verificationId, appDisplayName: displayName, displayName,
    appRoles: [role('Tenant.Read.All', 1), role('Other.Read', 2)],
    oauth2PermissionScopes: [], resourceSpecificApplicationPermissions: []
  };
  const fileName = 'verification-permissions.json';
  const bytes = JSON.stringify(source) + '\n';
  await writeFile(join(output, fileName), bytes, { flag: 'wx' });
  config.resources.push({ appId: source.appId, fileName, sha256: sourceDigest(bytes) });
  const configPath = join(output, 'catalog-resources.json');
  await writeFile(configPath, JSON.stringify(config) + '\n', { flag: 'wx' });
  return { configPath, config };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await addVerificationResource(process.argv[2]);
}
