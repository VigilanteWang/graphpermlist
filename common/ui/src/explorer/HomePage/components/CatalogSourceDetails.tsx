/** Home 的来源详情折叠区块，展示 client 返回的真实快照元数据。 */
import * as React from 'react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel } from '@fluentui/react-components';
import type { CatalogSourceMetadata } from '@graph/contracts';
import { MetadataTable } from '../../../components/MetadataTable.js';

/** 来源详情的数据和可选的 resource 名称；多资源目录用名称区分各来源区块。 */
interface CatalogSourceDetailsProps {
  resourceName?: string;
  source: CatalogSourceMetadata;
}

/** 一个 resource 的来源折叠项。API 显示导入时间，JSON 显示发布文件的生成时间。 */
export function CatalogSourceDetails({ resourceName, source }: CatalogSourceDetailsProps): React.ReactElement {
  const label = resourceName ? `${resourceName} catalog data details` : 'Catalog data details';
  // 不从浏览器时间或文件属性补造时间，保留来源本身的 UTC 值。
  const timestamp =
    'importedAt' in source
      ? { label: 'Imported at (UTC)', value: source.importedAt }
      : { label: 'Generated at (UTC)', value: source.generatedAt };
  return (
    <Accordion collapsible>
      <AccordionItem value="catalog-source">
        <AccordionHeader>{label}</AccordionHeader>
        <AccordionPanel>
          <MetadataTable
            label={label}
            fields={[
              { label: 'Source snapshot', value: source.fileName },
              timestamp,
              { label: 'Source SHA-256', value: source.sha256 },
              { label: 'Classification version', value: source.classificationVersion },
              { label: 'RSC definitions excluded', value: source.excludedRscCount }
            ]}
          />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
