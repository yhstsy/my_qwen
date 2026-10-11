import webpack from "webpack";
import createWebpackConfig from "../webpack.config.ts";

const compiler = webpack(createWebpackConfig());
if (!compiler) throw new Error("无法创建 webpack 编译器。");
await new Promise<void>((resolve, reject) => {
  compiler.run((error, stats) => {
    compiler.close((closeError) => {
      if (error || closeError) {
        reject(error || closeError);
        return;
      }
      if (!stats || stats.hasErrors()) {
        reject(
          new Error(
            stats?.toString({ all: false, errors: true, errorDetails: true }) ||
              "webpack 未返回构建结果。",
          ),
        );
        return;
      }
      console.log(stats.toString({ preset: "minimal", colors: false }));
      resolve();
    });
  });
});
console.log(
  "webpack 已将 React 网站构建至 dist/。模型 API 需要使用 Node 服务或 Vercel 函数。",
);
