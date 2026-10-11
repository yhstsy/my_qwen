import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
const key = process.env.QWEN_API_KEY;
const base = process.env.QWEN_API_BASE?.replace(/\/$/, '');
const model = process.env.QWEN_MODEL;
if (!key || !base || !model) throw new Error('请先在 .env 中配置 API Key、Base URL 和模型。');

interface ProviderResult {
  data?: {id: string}[];
  choices?: {message?: {content?: unknown}}[];
}

async function request(path: string, body?: unknown): Promise<ProviderResult> {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  // Upstream error bodies can contain credentials; only report the status.
  if (!response.ok) throw new Error(`接口验证失败：HTTP ${response.status}`);
  return response.json();
}

try {
  const models = await request('/models');
  const ids = models.data?.map(item => item.id) || [];
  console.log(JSON.stringify({model, listed: ids.includes(model), availableModels: ids}, null, 2));
  const code = `QWEN-${Math.floor(Math.random() * 1000000)}`;
  const result = await request('/chat/completions', {
    model, stream: false, max_tokens: 256,
    messages: [
      {role:'user', content:`请记住本次测试暗号：${code}。`},
      {role:'assistant', content:'好的，我记住了。'},
      {role:'user', content:'请只回复刚才的暗号，以及 17 加 26 的结果。'},
    ],
  });
  const content = result.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.includes(code) || !content.includes('43')) throw new Error('接口返回内容未通过上下文和计算验证。');
  console.log(JSON.stringify({verified:true, reply:content}, null, 2));
} catch (error) {
  // Do not print request objects, headers, or raw provider errors.
  console.error(error instanceof Error && error.name === 'TimeoutError' ? '接口验证超时。' : error instanceof Error && error.message.startsWith('接口') ? error.message : '接口验证失败，请检查网络和服务商配置。');
  process.exitCode = 1;
}
