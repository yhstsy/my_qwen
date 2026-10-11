import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const options = {cwd: root, stdio: 'inherit' as const};
const children = [
  spawn(process.execPath,[resolve(root,'node_modules/typescript/bin/tsc'),'--watch','--preserveWatchOutput'],options),
  spawn(process.execPath,['--watch',resolve(root,'.build/src/app-server.js')],options),
];
let stopping = false;
function stop(code = 0): void {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) {
  child.on('error',error => { console.error(error.message); stop(1); });
  child.on('exit',code => stop(code ?? 1));
}
process.on('SIGINT',() => stop());
process.on('SIGTERM',() => stop());
