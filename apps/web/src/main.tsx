/** 独立网站的 React 入口文件，读取 API 基址并把共享界面挂载到页面。 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { ExplorerShell } from '@graph/ui';
import { createCatalogClient } from '@graph/api-client';

// API 基址由 Vite 构建变量提供；本地开发默认连接本机 API。
const client = createCatalogClient(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1');
const root = document.getElementById('root');
// 页面必须提供 React 挂载容器，否则明确报告启动错误。
if (!root) throw new Error('Missing root element');
const reactRoot = createRoot(root);
reactRoot.render(<ExplorerShell client={client} hostLabel="Standalone website" viewportLayout />);
// Vite 热更新替换入口时卸载 React，让组件取消请求并断开 ResizeObserver。
if (import.meta.hot) import.meta.hot.dispose(() => reactRoot.unmount());
