import { Injectable, NotFoundException } from '@nestjs/common';
import type { ResourcesResponse } from '@graph/contracts';

@Injectable()
export class CatalogService {
  resources(): ResourcesResponse {
    return { dataState: 'not-imported', source: null, items: [] };
  }
  requireImportedResource(_resourceId: string): never {
    throw new NotFoundException('Resource not found. No catalog has been imported in this foundation stage.');
  }
}
