/** Home 的目录介绍与术语表，保留 permission 和 definition 的业务边界。 */
import * as React from 'react';
import { Body1, Title2 } from '@fluentui/react-components';
import { MetadataTable } from '../../../components/MetadataTable.js';

/** 目录术语及其英文解释；文案只描述目录能力，不推断租户授权。 */
const glossaryFields = [
  {
    label: 'Catalog',
    value:
      'The collection of permission definitions available to browse for an API resource, such as ' +
      'Microsoft Graph.'
  },
  {
    label: 'Permission',
    value:
      'A named access capability, such as Mail.Read. Application permissions let an app act without a' +
      ' signed-in user; Delegated permissions let an app act on behalf of a signed-in user.'
  },
  {
    label: 'Definition',
    value:
      'An individual Application or Delegated entry, with its own GUID, official title, description ' +
      'and enabled state. A permission name can have more than one definition.'
  },
  {
    label: 'How permissions are organized',
    value:
      'Choose an API resource, then a service category such as Exchange or Microsoft Entra ID. Within' +
      ' each service, permissions are grouped into families, usually by the name before the first ' +
      'dot: Mail.Read and Mail.Send belong to Mail. OpenID scopes have their own family.'
  },
  {
    label: 'One name, one row',
    value:
      'Within the same resource, Application and Delegated definitions with the same permission name ' +
      'appear in one row. Their types, GUIDs, official wording and consent requirements remain ' +
      'separate. Permission counts refer to merged names; definition counts refer to individual ' +
      'entries.'
  },
  {
    label: 'Catalog boundaries',
    value:
      'Disabled definitions are hidden until you select Show disabled. RSC permissions are excluded. ' +
      'This read-only explorer does not show your tenant’s granted permissions. Tenant policies may ' +
      'further restrict user consent.'
  },
  {
    label: 'SharePoint and Microsoft Graph',
    value:
      'SharePoint / OneDrive is a service category inside Microsoft Graph. The separate SharePoint ' +
      'API resource is coming soon.'
  }
];

/** 目录说明区块，展示产品用途以及 resource、permission 和 definition 的关系。 */
export function CatalogAbout(): React.ReactElement {
  return (
    <>
      <Title2 as="h2">About this catalog</Title2>
      <Body1>
        Permissions Explorer helps you browse and understand the Microsoft Graph API permissions in this
        catalog. Search for a permission, explore services and compare official descriptions and consent
        requirements.
      </Body1>
      <MetadataTable label="Catalog glossary" fields={glossaryFields} />
    </>
  );
}
