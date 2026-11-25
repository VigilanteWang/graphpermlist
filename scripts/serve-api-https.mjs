/** 本地 HTTPS 开发代理。读取调用者提供的证书和私钥，将请求转给本机 HTTP API。 */
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { request } from 'node:http';

/** HTTPS 开发代理的启动函数。监听 127.0.0.1，将 /api/v1 下的 GET 和 OPTIONS 请求转给本机 Nest。 */
function start() {
  const port = Number(process.env.LOCAL_HTTPS_PORT ?? 3443);
  const upstream = new URL(process.env.LOCAL_API_ORIGIN ?? 'http://127.0.0.1:3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535 || upstream.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(upstream.hostname) || upstream.pathname !== '/' ||
      upstream.username || upstream.password || upstream.search || upstream.hash) throw new Error('Invalid local proxy configuration');
  const server = createServer({
    key: readFileSync(process.env.LOCAL_HTTPS_KEY ?? ''),
    cert: readFileSync(process.env.LOCAL_HTTPS_CERT ?? '')
  }, (incoming, outgoing) => {
    // 用相同的路径和方法请求本机 API，转发 Origin 等 CORS 相关 header 及 Accept。
    if (!incoming.url?.startsWith('/api/v1/') || !['GET', 'OPTIONS'].includes(incoming.method ?? '')) {
      outgoing.writeHead(404).end();
      return;
    }
    const headers = {};
    for (const name of ['origin', 'accept', 'access-control-request-method', 'access-control-request-headers']) {
      if (incoming.headers[name]) headers[name] = incoming.headers[name];
    }
    const proxy = request(upstream, { path: incoming.url, method: incoming.method, headers, timeout: 10000 }, response => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    });
    proxy.on('timeout', () => proxy.destroy(new Error('Local catalog API request timed out')));
    proxy.on('error', () => { if (!outgoing.headersSent) outgoing.writeHead(502); outgoing.end('Local catalog API is unavailable'); });
    incoming.on('aborted', () => proxy.destroy());
    incoming.pipe(proxy);
  });
  server.on('error', () => { console.error('Local HTTPS proxy could not start'); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Local HTTPS catalog proxy listening on port ${port}`));
  /** 开发代理的退出清理函数，关闭监听和活动连接，避免留下占用端口的进程。 */
  function close() { server.close(); server.closeAllConnections(); }
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
try { start(); } catch { console.error('Local HTTPS proxy requires valid configuration and readable certificate/key files'); process.exitCode = 1; }
