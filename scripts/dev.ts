import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";
import createWebpackConfig, { projectRoot as root } from "../webpack.config.ts";

if (existsSync(resolve(root, ".env")))
  process.loadEnvFile(resolve(root, ".env"));
const port = Number(process.env.PORT || 5173);
const apiPort = Number(process.env.API_PORT || port + 1);
const options = { cwd: root, stdio: "inherit" as const };
const compiler = webpack(createWebpackConfig({}, { mode: "development" }));
if (!compiler) throw new Error("无法创建 webpack 开发编译器。");
const server = new WebpackDevServer(
  {
    host: "127.0.0.1",
    port,
    static: false,
    hot: true,
    liveReload: true,
    setupExitSignals: false,
    client: { overlay: true, logging: "warn" },
    devMiddleware: { stats: "errors-warnings" },
    proxy: [
      {
        context: (pathname: string) =>
          pathname === "/api" || pathname.startsWith("/api/"),
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: false,
      },
    ],
    watchFiles: [resolve(root, "public/**/*"), resolve(root, "index.html")],
  },
  compiler,
);
const children = [
  spawn(
    process.execPath,
    [
      resolve(root, "node_modules/typescript/bin/tsc"),
      "--watch",
      "--preserveWatchOutput",
    ],
    options,
  ),
  spawn(
    process.execPath,
    ["--watch", resolve(root, ".build/src/app-server.js")],
    { ...options, env: { ...process.env, PORT: String(apiPort) } },
  ),
];
let stopping = false;
function stop(code = 0): void {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  void server
    .stop()
    .then(
      () =>
        new Promise<void>((resolve, reject) => {
          compiler.close((error) => (error ? reject(error) : resolve()));
        }),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code ?? 1));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
try {
  await server.start();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  stop(1);
}
