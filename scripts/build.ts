import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const compiled = dirname(fileURLToPath(import.meta.url));
const root = resolve(compiled,'../..');
const dist = resolve(root,'dist');
// Recreate this generated directory so removed public files cannot survive a build.
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
for (const name of ['index.html','styles.css','assets']) {
  await cp(resolve(root,'public',name),resolve(dist,name),{recursive:true});
}
for (const name of ['app.js','chat.js']) await cp(resolve(root,'.build/src',name),resolve(dist,name));
console.log('静态网站已构建至 dist/。模型 API 需要使用 Node 服务启动。');
