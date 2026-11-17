/** Home 的来源详情折叠区块，展示 client 返回的真实快照元数据。 */
import * as React from 'react';
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel } from '@fluentui/react-components';
import type { ResourcesResponse } from '@graph/contracts';
import { MetadataTable } from '../../../components/MetadataTable.js';

/** 来源详情的数据输入；来源缺失时由 Home 决定不呈现此区块。 */
interface CatalogSourceDetailsProps {
  source: NonNullable<ResourcesResponse['source']>;
}

/** 可展开的来源详情；API 导入时间与 JSON 生成时间按契约分别显示。 */
export function CatalogSourceDetails({ source }: CatalogSourceDetailsProps): React.ReactElement {
  // 不从浏览器时间或文件属性补造时间，保留来源本身的 UTC 值。
  const timestamp =
    'importedAt' in source
      ? { label: 'Imported at (UTC)', value: source.importedAt }
      : { label: 'Generated at (UTC)', value: source.generatedAt };
  return (
    <Accordion collapsible>
      <AccordionItem value="catalog-source">
        <AccordionHeader>Catalog data details</AccordionHeader>
        <AccordionPanel>
          <MetadataTable
            label="Catalog data details"
            fields={[
              { label: 'Source snapshot', value: source.fileName },
              timestamp,
              { label: 'Source SHA-256', value: source.sha256 },
              { label: 'Classification version', value: source.classificationVersion }
            ]}
          />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}
