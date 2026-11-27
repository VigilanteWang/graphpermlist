/** 检查共享包的依赖范围、网站和 SPFx 使用的 React 版本，以及 SPFx 的构建产物。 */
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
const ui = await json('common/ui/package.json');
// 共享 UI 声明 React 版本要求，实际 React runtime 由独立网站和 SPFx 前端提供。
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
      assert.equal(pkg.version, '17.0.1'); // 已发布的 SPFx 内部依赖；SharePoint 页面上的 runtime 由外部提供。
    }
  }
  // 检查三个包最终解析到同一份 React，避免重复 runtime 影响组件运行。
  const resolved = [];
  for (const pkg of ['apps/web', 'apps/spfx', 'common/ui']) {
    resolved.push(await realpath(createRequire(new URL(`${pkg}/package.json`, root)).resolve(name)));
  }
  assert.equal(new Set(resolved).size, 1, `${name} resolves identically across UI and hosts`);
}
// 按角色列出全部允许的外部依赖；新增依赖必须显式审查，避免共享包依赖后端或特定前端。
const allowedDependencies = {
  'common/contracts': [],
  'common/catalog-json': ['@graph/contracts'],
  'common/ui': ['@graph/contracts', '@fluentui/react-components', 'react', 'react-dom'],
  'catalog/query': ['@graph/contracts'],
  'catalog/json-client': ['@graph/contracts', '@graph/catalog-core', '@graph/catalog-json'],
  'catalog/api-client': ['@graph/contracts'],
  'catalog/ingest': ['@graph/contracts']
};
/** 要检查的源码文件列表，递归收集 src 下各级目录中的 JavaScript 和 TypeScript 文件。 */
async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) files.push(...await sourceFiles(url));
    else if (/\.[cm]?[jt]sx?$/.test(entry.name)) files.push(url);
  }
  return files;
}
/** 单个依赖路径的检查。相对路径应留在当前共享包的 src 内，包名应出现在允许列表里。 */
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
  const metadata = await json(`${pkg}/package.json`);
  for (const name of Object.keys({ ...metadata.dependencies, ...metadata.peerDependencies, ...metadata.optionalDependencies })) {
    assert.ok(allowed.includes(name), `${pkg} has unapproved runtime dependency ${name}`);
  }
  const directory = new URL(`${pkg}/src/`, root);
  for (const file of await sourceFiles(directory)) {
    const source = await readFile(file, 'utf8');
    assert.ok(!/@microsoft\/sp-|WebPartContext|AadHttpClient|MSGraphClient/.test(source), `${pkg} has no SPFx identity/context dependency`);
    const ast = ts.createSourceFile(file.pathname, source, ts.ScriptTarget.Latest, true);
    /** 逐个检查 TypeScript 语法节点中的模块引用，包括静态导入、动态导入、require 和类型导入。 */
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
// 分别检查供 import 和 require 使用的构建产物。浏览器里的 JSON client 只需要查询与校验代码。
const dualModules = [
  ['catalog/query', 'index', '.', []],
  ['catalog/ingest', 'permission-model', '.', ['./classification.js']],
  ['catalog/ingest', 'classification', undefined, []],
  ['common/catalog-json', 'validation', './validation', []],
  ['catalog/json-client', 'index', '.', ['@graph/catalog-core', '@graph/catalog-json/validation']]
];
for (const [directory, moduleName, entry, allowed] of dualModules) {
  const metadata = await json(`${directory}/package.json`);
  for (const [condition, format] of [['import', 'esm'], ['require', 'cjs']]) {
    const output = `./dist/${format}/${moduleName}.js`;
    if (entry) assert.equal(metadata.exports[entry][condition].default, output);
    const source = await readFile(new URL(`${directory}/${output}`, root), 'utf8');
    const imports = ts.preProcessFile(source, true, true).importedFiles.map(item => item.fileName);
    assert.deepEqual([...new Set(imports)].sort(), allowed, `Unexpected emitted dependencies in ${directory}/${output}`);
  }
}
// SPFx 的 manifest 应声明由 SharePoint 提供的 React 组件；bundle 应含共享界面的提示文案。
// 再检查 bundle 中是否出现已知 React runtime 文件名。
const manifest = await json('apps/spfx/dist/125b85bf-862e-4c47-b499-c56fc875169c.manifest.json');
for (const name of ['react', 'react-dom/client']) {
  assert.equal(manifest.loaderConfig.scriptResources[name].type, 'component');
  assert.equal(manifest.loaderConfig.scriptResources[name].version, '18.3.1');
}
const bundle = manifest.loaderConfig.scriptResources['permissions-explorer-web-part'].path;
const text = await readFile(new URL(`apps/spfx/dist/${bundle}`, root), 'utf8');
assert.ok(text.includes('No catalog imported yet.'), 'SPFx includes shared shell');
assert.ok(!text.includes('react.production.min.js'), 'SPFx does not embed a React runtime');
console.log('PASS: UI/host imports resolve to React 18.3.1; SPFx runtime externals are pinned; recursive shared import and ESM/CJS dependency boundaries are clean. Legacy SPFx internal build dependencies are isolated.');
