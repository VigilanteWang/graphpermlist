/** 离线脱敏命令。保存字段白名单中的公开定义，原始导出和已有目标文件继续保留。 */
import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { sanitizePermissionsData } from './permissions-source.cjs';

const USAGE = 'Usage: npm run sanitize:data -- --input <export.json> --output <sanitized.json> --app-id <Resource App ID>';

/** 读取源文件、验证指定 resource 的公开字段并创建新的脱敏 JSON。 */
async function main() {
  const { values } = parseArgs({ options: {
    input: { type: 'string' }, output: { type: 'string' }, 'app-id': { type: 'string' }
  } });
  if (!values.input || !values.output || !values['app-id']) throw new Error(USAGE);
  const input = await readFile(values.input);
  const data = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(input));
  const sanitized = sanitizePermissionsData(data, values['app-id']);
  // 使用独占创建，误把目标指定为原文件时也不会覆盖。
  await writeFile(values.output, JSON.stringify(sanitized, null, 2) + '\n', { flag: 'wx' });
  console.log('Sanitized permission source written.');
}

main().catch(error => {
  console.error(error.message === USAGE ? USAGE :
    'Could not sanitize input. Check the Resource App ID, input schema and permissions, and choose a new output file.');
  process.exitCode = 1;
});
