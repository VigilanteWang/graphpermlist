/** 共享包与宿主的依赖边界检查脚本，包含 SPFx 构建产物的 React 外部依赖检查。 */
import assert from 'node:assert/strict';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { createRequire, builtinModules } from 'node:module';
import ts from 'typescript';

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
// 按角色列出全部允许的外部依赖；新增依赖必须显式审查，不能悄悄拖入后端或宿主对象。
const allowedDependencies = {
  contracts: [],
  'catalog-core': ['@graph/contracts'],
  'api-client': ['@graph/contracts'],
  ui: ['@graph/contracts', '@fluentui/react-components', 'react', 'react-dom']
};
/** 共享源码文件的递归枚举函数，覆盖嵌套目录而非只检查包的第一层。 */
async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) files.push(...await sourceFiles(url));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(url);
  }
  return files;
}
/** 模块路径的边界检查函数，拒绝 Node 内置模块、宿主包、后端包和相对路径越界。 */
function checkSpecifier(specifier, file, directory, allowed) {
  assert.ok(!specifier.startsWith('node:') && !builtinModules.includes(specifier), `No Node builtin: ${specifier}`);
  if (specifier.startsWith('.')) {
    assert.ok(new URL(specifier, file).href.startsWith(directory.href), `No shared source escape: ${specifier}`);
  } else {
    const name = specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0];
    assert.ok(allowed.includes(name), `Unapproved shared dependency: ${specifier}`);
  }
}
for (const [pkg, allowed] of Object.entries(allowedDependencies)) {
  const metadata = await json(`packages/${pkg}/package.json`);
  for (const name of Object.keys({ ...metadata.dependencies, ...metadata.peerDependencies, ...metadata.optionalDependencies })) {
    assert.ok(allowed.includes(name), `${pkg} has unapproved runtime dependency ${name}`);
  }
  const directory = new URL(`packages/${pkg}/src/`, root);
  for (const file of await sourceFiles(directory)) {
    const source = await readFile(file, 'utf8');
    assert.ok(!/@microsoft\/sp-|WebPartContext|AadHttpClient|MSGraphClient/.test(source), `${pkg} has no SPFx identity/context dependency`);
    const ast = ts.createSourceFile(file.pathname, source, ts.ScriptTarget.Latest, true);
    /** 模块引用的 AST 访问函数，覆盖 import/export、动态 import、require 和手写类型引用。 */
    function visit(node) {
      let specifier;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) specifier = node.moduleSpecifier;
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) specifier = node.moduleReference.expression;
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) specifier = node.argument.literal;
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        ts.isIdentifier(node.expression) && node.expression.text === 'require')) {
        specifier = node.arguments[0];
        assert.ok(specifier && ts.isStringLiteral(specifier), 'Shared dynamic imports must use explicit paths');
      }
      if (specifier) {
        assert.ok(ts.isStringLiteral(specifier), 'Shared imports must use explicit paths');
        checkSpecifier(specifier.text, file, directory, allowed);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.equal(ast.referencedFiles.length, 0, 'Shared source cannot escape with triple-slash file references');
    assert.equal(ast.typeReferenceDirectives.length, 0, 'Shared source cannot inject ambient host/Node types');
  }
}
// 双出口都只能依赖中立类型；实际 require/import 查询由核心测试和独立 HTTP 进程验证。
const core = await json('packages/catalog-core/package.json');
assert.equal(core.exports['.'].import.default, './dist/esm/index.js');
assert.equal(core.exports['.'].require.default, './dist/cjs/index.js');
for (const format of ['esm', 'cjs']) {
  const output = await readFile(new URL(`packages/catalog-core/dist/${format}/index.js`, root), 'utf8');
  assert.ok(!/\brequire\s*\(|\bimport\s|\bimport\s*\(/.test(output), 'Pure core has no emitted runtime dependencies');
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
console.log('PASS: UI/host imports resolve to React 18.3.1; SPFx runtime externals are pinned; recursive shared import/dependency boundaries and pure ESM/CJS core outputs are clean. Legacy SPFx internal build dependencies are isolated.');
