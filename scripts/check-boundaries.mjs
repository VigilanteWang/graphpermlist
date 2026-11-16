/** 共享包与宿主的依赖边界检查脚本，包含 SPFx 构建产物的 React 外部依赖检查。 */
import assert from 'node:assert/strict';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';

const root = new URL('../', import.meta.url);
/**
 * 仓库内 JSON 文件的异步读取函数，路径相对于仓库根目录。
 * @param {string} path 文件在仓库中的相对路径。
 * @returns {Promise<object>} 解析后的 JSON 内容。
 */
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const ui = await json('packages/ui/package.json');
// 共享 UI 声明 React 版本要求，实际 React runtime 由 web 和 SPFx 宿主提供。
assert.equal(ui.peerDependencies.react, '18.3.1');
assert.equal(ui.peerDependencies['react-dom'], '18.3.1');
assert.ok(!ui.dependencies.react && !ui.dependencies['react-dom'], 'UI runtime belongs to hosts');
const lock = await json('package-lock.json');
for (const name of ['react', 'react-dom']) {
  const copies = Object.entries(lock.packages).filter(([key]) => key.endsWith(`/node_modules/${name}`) || key === `node_modules/${name}`);
  const legacyOwners = ['@microsoft/sp-loader', '@microsoft/sp-property-pane', '@microsoft/sp-webpart-base'];
  for (const [path, pkg] of copies) {
    if (path === `node_modules/${name}`) assert.equal(pkg.version, '18.3.1');
    else {
      assert.ok(legacyOwners.some(owner => path === `node_modules/${owner}/node_modules/${name}`), `Unexpected React copy: ${path}`);
      assert.equal(pkg.version, '17.0.1'); // 已发布的 SPFx 内部依赖；真实宿主中的 runtime 由外部提供。
    }
  }
  // 检查三个包最终解析到同一份 React，避免重复 runtime 影响组件运行。
  const resolved = [];
  for (const pkg of ['apps/web', 'apps/spfx', 'packages/ui']) {
    resolved.push(await realpath(createRequire(new URL(`${pkg}/package.json`, root)).resolve(name)));
  }
  assert.equal(new Set(resolved).size, 1, `${name} resolves identically across UI and hosts`);
}
// 共享包不得依赖 SPFx context 或 identity client，确保可被多个宿主复用。
for (const pkg of ['ui', 'api-client', 'contracts']) {
  for (const entry of await readdir(new URL(`packages/${pkg}/src/`, root))) {
    const source = await readFile(new URL(`packages/${pkg}/src/${entry}`, root), 'utf8');
    assert.ok(!/@microsoft\/sp-|WebPartContext|AadHttpClient|MSGraphClient/.test(source), `${pkg} has no SPFx identity/context dependency`);
  }
}
// 检查已构建 manifest 的 React 外部组件声明，再确认 bundle 包含共享界面且未嵌入指定 React 文件。
const manifest = await json('apps/spfx/dist/125b85bf-862e-4c47-b499-c56fc875169c.manifest.json');
for (const name of ['react', 'react-dom/client']) {
  assert.equal(manifest.loaderConfig.scriptResources[name].type, 'component');
  assert.equal(manifest.loaderConfig.scriptResources[name].version, '18.3.1');
}
const bundle = manifest.loaderConfig.scriptResources['permissions-explorer-web-part'].path;
const text = await readFile(new URL(`apps/spfx/dist/${bundle}`, root), 'utf8');
assert.ok(text.includes('No catalog imported yet.'), 'SPFx includes shared shell');
assert.ok(!text.includes('react.production.min.js'), 'SPFx does not embed a React runtime');
console.log('PASS: UI/host imports resolve to React 18.3.1; SPFx runtime externals are pinned; shared boundaries are clean. Legacy SPFx internal build dependencies are isolated.');
