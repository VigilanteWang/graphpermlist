import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { PropertyPaneTextField, type IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { ExplorerShell } from '@graph/ui';
import { createCatalogClient } from '@graph/api-client';

export interface IPermissionsExplorerWebPartProps { apiBaseUrl: string; }

export default class PermissionsExplorerWebPart extends BaseClientSideWebPart<IPermissionsExplorerWebPartProps> {
  private _root: Root | undefined;

  public render(): void {
    if (!this._root) this._root = createRoot(this.domElement);
    this._root.render(React.createElement(ExplorerShell, {
      client: createCatalogClient(this.properties.apiBaseUrl),
      hostLabel: 'SharePoint Web Part'
    }));
  }

  protected onDispose(): void {
    this._root?.unmount();
    this._root = undefined;
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return { pages: [{ groups: [{ groupName: 'Catalog API', groupFields: [
      PropertyPaneTextField('apiBaseUrl', { label: 'API base URL (including /api/v1)' })
    ] }] }] };
  }
}
