import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = resolve(root,'dist');
await mkdir(dist,{recursive:true});
for (const name of ['index.html','styles.css','app.js','chat.js','assets']) {
  await cp(resolve(root,name),resolve(dist,name),{recursive:true});
}
console.log('静态网站已构建至 dist/。模型 API 需要使用 Node 服务启动。');
