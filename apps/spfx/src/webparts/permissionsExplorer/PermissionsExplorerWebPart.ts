/** SharePoint Web Part 的宿主入口文件；共享 UI 保持独立于 SPFx 上下文。 */
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { PropertyPaneTextField, type IPropertyPaneConfiguration } from '@microsoft/sp-property-pane';
import { ExplorerShell } from '@graph/ui';
import { createCatalogClient, type CatalogClient } from '@graph/api-client';
import type { IReadonlyTheme } from '@microsoft/sp-component-base';

/** Web Part 的可配置属性结构，包含带 /api/v1 的 API 基址。 */
export interface IPermissionsExplorerWebPartProps { apiBaseUrl: string; }

/** 目录浏览器的 SPFx Web Part 类，负责共享 React 界面的挂载、属性配置和卸载。 */
export default class PermissionsExplorerWebPart extends BaseClientSideWebPart<IPermissionsExplorerWebPartProps> {
  private _root: Root | undefined;
  private _client: CatalogClient | undefined;
  private _apiBaseUrl: string | undefined;
  private _themeMode: 'light' | 'dark' = 'light';

  /** Web Part 的渲染生命周期方法，在当前容器中渲染共享界面并传入目录客户端。 */
  public render(): void {
    // 属性修改会再次触发 render；复用同一个 React root。
    if (!this._root) this._root = createRoot(this.domElement);
    // 仅配置变化时重建 client，普通宿主重绘不取消用户正在浏览的查询。
    if (!this._client || this._apiBaseUrl !== this.properties.apiBaseUrl) {
      this._apiBaseUrl = this.properties.apiBaseUrl;
      this._client = createCatalogClient(this.properties.apiBaseUrl);
    }
    this._root.render(React.createElement(ExplorerShell, {
      client: this._client,
      themeMode: this._themeMode,
      hostLabel: 'SharePoint Web Part'
    }));
  }

  /** Web Part 的销毁生命周期方法，卸载 React 并清理组件及其请求等副作用。 */
  protected onDispose(): void {
    this._root?.unmount();
    this._root = undefined;
    this._client = undefined;
  }

  /** SharePoint 主题变化的生命周期方法，记录对应的 Fluent 明暗主题；SPFx 随后负责 render。 */
  protected onThemeChanged(theme: IReadonlyTheme | undefined): void {
    this._themeMode = theme?.isInverted ? 'dark' : 'light';
  }

  /** Web Part 属性面板的配置方法，返回 API 基址输入框的定义。 */
  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return { pages: [{ groups: [{ groupName: 'Catalog API', groupFields: [
      PropertyPaneTextField('apiBaseUrl', { label: 'API base URL (including /api/v1)' })
    ] }] }] };
  }
}
