/** 在 SharePoint 页面上启动 API 版目录 Web Part，把站点主题和目录 client 交给共享 React 界面。 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { PropertyPaneTextField, type IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { ExplorerShell } from '@graph/ui';
import { createApiCatalogClient, type CatalogClient } from '@graph/api-client';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';

/** Web Part 的可配置属性结构，包含带 /api/v1 的 API 基址。 */
export interface IPermissionsExplorerWebPartProps { apiBaseUrl: string; }

/** SharePoint 页面上的一个目录 Web Part，维护自己的 React root、API 基址和主题。 */
export default class PermissionsExplorerWebPart extends BaseClientSideWebPart<IPermissionsExplorerWebPartProps> {
  private _root: Root | undefined;
  private _client: CatalogClient | undefined;
  private _apiBaseUrl: string | undefined;
  private _themeMode: 'light' | 'dark' = 'light';

  /** 把目录界面画在当前 Web Part 容器中，传入客户端和当前明暗主题。 */
  public render(): void {
    // 属性修改会再次触发 render；复用同一个 React root。
    if (!this._root) this._root = createRoot(this.domElement);
    // 第一次渲染或 API 基址改动时创建 client。仅主题变化时复用 client，查询可以继续。
    if (!this._client || this._apiBaseUrl !== this.properties.apiBaseUrl) {
      this._apiBaseUrl = this.properties.apiBaseUrl;
      this._client = createApiCatalogClient(this.properties.apiBaseUrl);
    }
    this._root.render(React.createElement(ExplorerShell, {
      client: this._client,
      themeMode: this._themeMode,
      hostLabel: 'SharePoint Web Part'
    }));
  }

  /** SharePoint 销毁 Web Part 时卸载 React，让组件清理正在进行的请求。 */
  protected onDispose(): void {
    this._root?.unmount();
    this._root = undefined;
    this._client = undefined;
  }

  /** 把 SharePoint 的反色标记转换为 Fluent 的明暗主题，供随后渲染使用。 */
  protected onThemeChanged(theme: IReadonlyTheme | undefined): void {
    this._themeMode = theme?.isInverted ? 'dark' : 'light';
  }

  /** 定义页面编辑者用来设置 API 基址的属性面板输入框。 */
  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return { pages: [{ groups: [{ groupName: 'Catalog API', groupFields: [
      PropertyPaneTextField('apiBaseUrl', { label: 'API base URL (including /api/v1)' })
    ] }] }] };
  }
}
