/** npm run verify:data 的入口。用共享加载器检查本地 permission 文件，再输出摘要和数量。 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPermissionsSource } from './permissions-source.cjs';
export { DEFAULT_PERMISSIONS_SOURCE, SNAPSHOT_SHA256, validatePermissionsData, loadPermissionsSource } from './permissions-source.cjs';

// 只有直接运行本文件时才执行校验；被其他模块导入时仅提供导出。
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const { sha256, counts } = await loadPermissionsSource();
    console.log(JSON.stringify({ status: 'ok', sha256, counts }, null, 2));
  } catch (error) {
    console.error(`Data verification failed: ${error.message}`);
    // 非零退出码让 npm 或持续集成流程识别校验失败。
    process.exitCode = 1;
  }
}
