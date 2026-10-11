import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Configuration } from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";

const directory = dirname(fileURLToPath(import.meta.url));
export const projectRoot =
  basename(directory) === ".build" ? dirname(directory) : directory;

export default function createWebpackConfig(
  _env: unknown = {},
  { mode = "production" }: { mode?: "development" | "production" } = {},
): Configuration {
  const development = mode === "development";
  return {
    mode,
    context: projectRoot,
    target: ["web", "es2022"],
    entry: { index: resolve(projectRoot, "src/client/main.tsx") },
    output: {
      path: resolve(projectRoot, "dist"),
      filename: "assets/[name]-[contenthash:8].js",
      publicPath: "/",
      clean: true,
    },
    devtool: development ? "cheap-module-source-map" : false,
    // Preserve a budget close to the existing 263 KB frontend while reporting growth.
    performance: { maxAssetSize: 300 * 1024, maxEntrypointSize: 300 * 1024 },
    resolve: { extensions: [".tsx", ".ts", ".js"] },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              babelrc: false,
              configFile: false,
              presets: [
                ["@babel/preset-react", { runtime: "automatic", development }],
                [
                  "@babel/preset-typescript",
                  {
                    allExtensions: true,
                    isTSX: true,
                    onlyRemoveTypeImports: true,
                  },
                ],
              ],
              plugins: development ? ["react-refresh/babel"] : [],
            },
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: resolve(projectRoot, "index.html"),
        scriptLoading: "defer",
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: resolve(projectRoot, "public/styles.css"), to: "styles.css" },
          { from: resolve(projectRoot, "public/assets"), to: "assets" },
        ],
      }),
      ...(development
        ? [new ReactRefreshWebpackPlugin({ overlay: false })]
        : []),
    ],
    watchOptions: {
      ignored: /[\\/](?:node_modules|\.build|\.cache|\.vercel|dist)[\\/]/,
    },
  };
}
