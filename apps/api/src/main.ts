import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createApp } from './bootstrap';

async function main(): Promise<void> {
  const app = await createApp();
  const config = app.get(ConfigService);
  await app.listen(config.getOrThrow<number>('PORT'), config.getOrThrow<string>('HOST'));
}
main().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.message : 'API startup failed', undefined, 'Bootstrap');
  process.exitCode = 1;
});
