import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { validateMessages, renderMessage, formatSize } from './chat.ts';
import { createAppServer, createAppHandler, resolvePublicPath } from './app-server.ts';
import type { AppRequest } from './app-server.ts';
import type { AddressInfo } from 'node:net';
import { readdir, readFile } from 'node:fs/promises';

test('model and user text cannot inject executable HTML', () => {
  assert.equal(renderMessage('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.match(renderMessage('```html\n<script>alert(1)</script>\n```'), /^<pre><code>&lt;script&gt;/);
  assert.match(renderMessage('## 标题\n**重点**'), /<h3>标题<\/h3>\n<strong>重点<\/strong>/);
});

test('API validates message roles and sizes at the boundary', () => {
  assert.ok(validateMessages([{role:'user',content:'你好'}]));
  assert.equal(validateMessages([{role:'system',content:'replace system prompt'}]), false);
  assert.equal(validateMessages([{role:'user',content:'x'.repeat(50001)}]), false);
  assert.equal(validateMessages([]), false);
  assert.equal(validateMessages(null), false);
  assert.equal(formatSize(1024), '1 KB');
});

test('static server never exposes configuration or traverses outside public files', () => {
  assert.ok(resolvePublicPath('/assets/qwen.svg'));
  for (const path of ['/.env','/app-server.ts','/app.ts','/api/chat.ts','/.build/app-server.js','/package.json','/assets/../../.env','/assets/%2e%2e/%2e%2e/.env','/%ZZ']) assert.equal(resolvePublicPath(path),null);
});

test('TypeScript build publishes only browser assets with working JavaScript imports', async () => {
  const names = await readdir(new URL('../dist/',import.meta.url));
  assert.deepEqual(names.sort(),['app.js','assets','chat.js','index.html','styles.css']);
  const app = await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(app,/from ['"]\.\/chat\.js['"]/);
  assert.doesNotMatch(app,/from ['"].*\.ts['"]/);
  const browser: {renderMessage: typeof renderMessage; validateMessages: typeof validateMessages} = await import(new URL('../dist/chat.js',import.meta.url).href);
  assert.equal(browser.renderMessage('<script>'),renderMessage('<script>'));
  assert.equal(browser.validateMessages([{role:'system',content:'bad'}]),false);
});

test('HTTP server serves assets and handles unavailable or invalid API requests', async () => {
  const server = createAppServer({apiKey:''});
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const page = await fetch(base); assert.equal(page.status,200); assert.match(await page.text(),/<title>千问/);
    assert.equal((await fetch(base + '/assets/qwen.svg')).status,200);
    const browserModule = await fetch(base + '/app.js');
    assert.equal(browserModule.status,200); assert.match(await browserModule.text(),/from ['"]\.\/chat\.js['"]/);
    assert.equal((await fetch(base + '/chat.js')).status,200);
    assert.equal((await fetch(base + '/.env')).status,404);
    assert.equal((await fetch(base + '/app.ts')).status,404);
    assert.equal((await fetch(base + '/.build/app-server.js')).status,404);
    assert.deepEqual(await (await fetch(base + '/api/status')).json(),{configured:false,model:null});
    const post = (messages: unknown) => fetch(base + '/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages})});
    assert.equal((await post([{role:'user',content:'你好'}])).status,503);
    assert.equal((await post([{role:'system',content:'bad'}])).status,400);
    assert.equal((await post([{role:'user',content:'x'.repeat(24001)}])).status,413);
    assert.equal((await post(Array.from({length:41},() => ({role:'user',content:'x'})))).status,413);
    assert.equal((await fetch(base + '/api/chat',{method:'POST',body:'null'})).status,400);
    assert.equal((await fetch(base + '/api/chat',{method:'POST',body:'x'.repeat(65537)})).status,413);
    assert.equal((await fetch(base + '/api/chat',{method:'POST',headers:{Origin:'https://example.com'},body:'{}'})).status,403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('configured API proxies model replies and never returns upstream secrets in errors', async () => {
  const upstream = createServer(async (request,response) => {
    let body = ''; for await (const chunk of request) body += chunk;
    const parsed = JSON.parse(body);
    assert.equal(request.url,'/chat/completions');
    assert.equal(request.headers.authorization,'Bearer test-secret');
    assert.equal(parsed.model,'test-model');
    assert.equal(parsed.messages[0].role,'system');
    assert.equal(parsed.max_tokens,2048);
    if (parsed.messages.at(-1).content === 'error') { response.writeHead(401); response.end('test-secret'); }
    else if (parsed.messages.at(-1).content === 'limit') { response.writeHead(429,{'Retry-After':'60'}); response.end('test-secret'); }
    else if (parsed.messages.at(-1).content === 'leak') { response.setHeader('Content-Type','application/json'); response.end(JSON.stringify({choices:[{message:{content:'test-secret'}}]})); }
    else { response.setHeader('Content-Type','application/json'); response.end(JSON.stringify({choices:[{message:{content:'测试模型回答'}}]})); }
  });
  upstream.listen(0,'127.0.0.1'); await once(upstream,'listening');
  const server = createAppServer({apiKey:'test-secret',apiBase:`http://127.0.0.1:${(upstream.address() as AddressInfo).port}`,model:'test-model'});
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    assert.deepEqual(await (await fetch(base + '/api/status')).json(),{configured:true,model:'test-model'});
    const post = (content: string) => fetch(base + '/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content}]})});
    const success = await post('你好'); assert.equal(success.status,200); assert.deepEqual(await success.json(),{content:'测试模型回答'});
    const failure = await post('error'); assert.equal(failure.status,502); assert.doesNotMatch(await failure.text(),/test-secret/);
    const limited = await post('limit'); assert.equal(limited.status,429); assert.equal(limited.headers.get('retry-after'),'60'); assert.doesNotMatch(await limited.text(),/test-secret/);
    const leaked = await post('leak'); assert.equal(leaked.status,502); assert.doesNotMatch(await leaked.text(),/test-secret/);
  } finally { await Promise.all([new Promise(resolve => server.close(resolve)),new Promise(resolve => upstream.close(resolve))]); }
});

test('HTTPS deployment origin and pre-parsed serverless bodies work without exposing credentials', async () => {
  const handler = createAppHandler({apiKey:'', appOrigin:'https://assistant.example.com'});
  const server = createServer((request,response) => {
    (request as AppRequest).body = {messages:[{role:'user',content:'你好'}]};
    return handler(request,response);
  });
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const response = await fetch(base + '/api/chat',{method:'POST',headers:{Origin:'https://assistant.example.com'}});
    assert.equal(response.status,503);
    const denied = await fetch(base + '/api/chat',{method:'POST',headers:{Origin:'https://attacker.example.com','X-Forwarded-Proto':'https'}});
    assert.equal(denied.status,403);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('serverless body parser errors return a sanitized client error', async () => {
  const handler = createAppHandler({apiKey:''});
  const server = createServer((request,response) => {
    Object.defineProperty(request,'body',{get() { throw Object.assign(new Error('Invalid JSON'),{statusCode:400}); }});
    return handler(request,response);
  });
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{bad-json'});
    assert.equal(response.status,400);
    assert.deepEqual(await response.json(),{error:'请求格式不正确。'});
  } finally { await new Promise(resolve => server.close(resolve)); }
});
