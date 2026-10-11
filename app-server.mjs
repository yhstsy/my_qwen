import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateMessages } from './chat.js';

const root = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(root, '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const publicFiles = new Set(['index.html','styles.css','app.js','chat.js']);
const contentTypes = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};

export function resolvePublicPath(pathname) {
  let path;
  try { path = decodeURIComponent(pathname); } catch { return null; }
  if (path === '/') path = '/index.html';
  const name = path.replace(/^\/+/, '');
  if (!publicFiles.has(name) && !name.startsWith('assets/')) return null;
  const absolute = resolve(root, name);
  return absolute.startsWith(root + sep) && contentTypes[extname(absolute)] ? absolute : null;
}

function json(response, status, body) {
  response.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let parsedBody;
  try { parsedBody = request.body; }
  catch(error) {
    if (error.statusCode === 400) throw Object.assign(new Error('请求格式不正确。'), {status:400});
    throw error;
  }
  if (parsedBody !== undefined) {
    const raw = typeof parsedBody === 'string' || Buffer.isBuffer(parsedBody) ? parsedBody : JSON.stringify(parsedBody);
    if (Buffer.byteLength(raw) > 64 * 1024) throw Object.assign(new Error('消息内容过长，请缩短后再试。'), {status:413});
    try { return JSON.parse(raw.toString()); }
    catch { throw Object.assign(new Error('请求格式不正确。'), {status:400}); }
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw Object.assign(new Error('消息内容过长，请缩短后再试。'), {status:413});
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('请求格式不正确。'), {status:400}); }
}

export function createAppHandler({apiKey = process.env.QWEN_API_KEY, apiBase = process.env.QWEN_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1', model = process.env.QWEN_MODEL || 'qwen-plus', appOrigin = process.env.APP_ORIGIN} = {}) {
  return async (request,response) => {
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    const url = new URL(request.url, 'http://localhost');
    try {
      if (url.pathname === '/api/status' && request.method === 'GET') { json(response,200,{configured:!!apiKey,model:apiKey ? model : null}); return; }
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const protocol = request.socket.encrypted || (process.env.VERCEL === '1' && request.headers['x-forwarded-proto'] === 'https') ? 'https' : 'http';
        const origin = appOrigin || `${protocol}://${request.headers.host}`;
        if (request.headers.origin && request.headers.origin !== origin) { json(response,403,{error:'不允许跨站调用。'}); return; }
        const body = await readBody(request);
        if (!validateMessages(body?.messages)) { json(response,400,{error:'消息格式不正确，请重新发起对话。'}); return; }
        if (body.messages.length > 40 || body.messages.reduce((size,message) => size + message.content.length,0) > 24000) { json(response,413,{error:'对话或附件内容过长，请新建对话或缩短文本。'}); return; }
        if (!apiKey) { json(response,503,{error:'尚未配置模型服务，当前为本地演示模式。'}); return; }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(),55000);
        response.on('close', () => { if (!response.writableEnded) controller.abort(); });
        try {
          const upstream = await fetch(`${apiBase.replace(/\/$/,'')}/chat/completions`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Authorization':`Bearer ${apiKey}`},
            body:JSON.stringify({model,messages:[{role:'system',content:'你是一位友好、专业的中文 AI 助手。准确回答用户的问题。无法读取的附件需如实说明；不得声称已执行未接入的外部操作。'},...body.messages],stream:false,max_tokens:2048}),
            signal:controller.signal,
          });
          if (!upstream.ok) {
            const message = upstream.status === 401 || upstream.status === 403 ? '模型服务认证失败，请检查服务端 API 配置。' : upstream.status === 429 ? '模型服务请求过于频繁或额度不足，请稍后重试。' : '模型服务暂时不可用，请稍后重试。';
            if (upstream.status === 429) {
              const retry = upstream.headers.get('retry-after');
              if (retry && /^\d{1,5}$/.test(retry)) response.setHeader('Retry-After',retry);
            }
            json(response,upstream.status === 429 ? 429 : 502,{error:message}); return;
          }
          const result = await upstream.json();
          const content = result.choices?.[0]?.message?.content;
          if (typeof content !== 'string' || !content.trim()) { json(response,502,{error:'模型未返回有效内容，请重试。'}); return; }
          if (content.includes(apiKey)) { json(response,502,{error:'模型返回了不安全内容，已阻止发送。'}); return; }
          json(response,200,{content});
        } catch(error) {
          if (!response.destroyed) json(response,502,{error:error.name === 'AbortError' ? '模型响应超时，请稍后重试。' : '无法连接模型服务，请检查网络或服务端配置。'});
        } finally { clearTimeout(timeout); }
        return;
      }
      if (!['GET','HEAD'].includes(request.method)) { json(response,405,{error:'不支持此请求方式。'}); return; }
      const path = resolvePublicPath(url.pathname);
      if (!path) { json(response,404,{error:'页面不存在。'}); return; }
      const content = await readFile(path);
      response.writeHead(200,{'Content-Type':contentTypes[extname(path)],'Cache-Control':'no-cache'});
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch(error) {
      if (!response.headersSent) json(response,error.status || (error.code === 'ENOENT' ? 404 : 500),{error:error.status ? error.message : '无法完成请求。'});
    }
  };
}

export function createAppServer(options) {
  return createServer(createAppHandler(options));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 5173);
  const server = createAppServer();
  server.listen(port,'127.0.0.1',() => console.log(`千问界面已启动\nLocal: http://127.0.0.1:${port}\n模型模式: ${process.env.QWEN_API_KEY ? '已连接 API' : '本地演示'}`));
  server.on('error',error => { console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请修改 PORT 后启动。` : error.message); process.exitCode = 1; });
}
