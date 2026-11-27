/** npm run verify:data 的入口。用导入和导出共用的加载器校验所有已配置的源。 */
import { loadPermissionsSources } from './permissions-source.cjs';
export { loadPermissionsSource, validatePermissionsData } from './permissions-source.cjs';

try {
  const { inputs, schemaVersion } = await loadPermissionsSources();
  const resources = inputs.map(({ data, fileName, sha256, counts }) => ({ appId: data.appId, fileName, sha256, counts }));
  const { sha256, counts } = resources[0];
  console.log(JSON.stringify(schemaVersion === 1 ? { status: 'ok', sha256, counts } : { status: 'ok', resources }, null, 2));
} catch (error) {
  console.error(`Data verification failed: ${error.message}`);
  process.exitCode = 1;
}
