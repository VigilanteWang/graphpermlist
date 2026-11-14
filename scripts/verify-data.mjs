import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPermissionsSource } from './permissions-source.cjs';
export { DEFAULT_PERMISSIONS_SOURCE, SNAPSHOT_SHA256, validatePermissionsData, loadPermissionsSource } from './permissions-source.cjs';

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { sha256, counts } = await loadPermissionsSource();
    console.log(JSON.stringify({ status: 'ok', sha256, counts }, null, 2));
  } catch (error) {
    console.error(`Data verification failed: ${error.message}`);
    process.exitCode = 1;
  }
}
