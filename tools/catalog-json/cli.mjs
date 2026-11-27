/** 离线目录发布命令。解析参数、显示校验结果并设置退出码。 */
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { JsonCatalogError, isIsoUtcTimestamp } from '@graph/catalog-json/validation';
import { generate, verify } from './publication.mjs';

const USAGE = 'Usage: catalog-json export --output <directory> [--generated-at <ISO UTC>] | verify --output <directory>';

/** 命令行主函数。export 生成并发布本地快照，verify 只检查 --output 目录里的现有文件。 */
async function main() {
  const [command, ...args] = process.argv.slice(2);
  const { values } = parseArgs({ args, options: { output: { type: 'string' }, 'generated-at': { type: 'string' } } });
  const specifiedTime = values['generated-at'];
  if (!values.output?.trim() || (command !== 'export' && command !== 'verify')
    || (specifiedTime !== undefined && (command !== 'export' || !isIsoUtcTimestamp(specifiedTime)))) {
    throw new JsonCatalogError('invalid-snapshot', USAGE);
  }
  const output = resolve(values.output);
  const result = command === 'verify' ? await verify(output)
    : await generate(output, specifiedTime === undefined ? new Date().toISOString() : new Date(specifiedTime).toISOString());
  const { manifest, snapshot, byteLength } = result;
  const definitions = snapshot.resources.flatMap(resource => resource.definitions);
  const disabled = definitions.filter(entry => !entry.definition.isEnabled).length;
  console.log(`${command === 'verify' ? 'Verified' : 'Published'} ${manifest.snapshot} (${byteLength} bytes)`);
  console.log(`SHA256: ${manifest.artifactSha256}`);
  const excludedRscCount = snapshot.schemaVersion === 1 ? snapshot.source.excludedRscCount
    : snapshot.resources.reduce((sum, resource) => sum + resource.source.excludedRscCount, 0);
  console.log(`Definitions: ${definitions.length} total, ${disabled} disabled, ${excludedRscCount} RSC excluded`);
}

main().catch(error => {
  let message = 'Could not read or write the catalog publication directory.';
  if (error instanceof JsonCatalogError) message = error.message;
  if (error.code?.startsWith('ERR_PARSE_ARGS_')) message = USAGE;
  if (error.code === 'ENOENT') message = 'The catalog publication file or directory was not found.';
  console.error(message);
  process.exitCode = 1;
});
