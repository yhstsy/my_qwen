import test from "node:test";
import assert from "node:assert/strict";
import createWebpackConfig from "../webpack.config.ts";

test("webpack isolates development refresh and source maps from production", () => {
  const production = createWebpackConfig();
  const development = createWebpackConfig({}, { mode: "development" });
  const names = (config: typeof production) =>
    config.plugins!.map((plugin) => plugin && plugin.constructor.name);
  assert.ok(names(development).includes("ReactRefreshPlugin"));
  assert.ok(!names(production).includes("ReactRefreshPlugin"));
  assert.equal(production.devtool, false);
  assert.equal(production.output?.publicPath, "/");
  assert.equal(production.output?.clean, true);
  assert.equal(production.mode, "production");
  assert.ok(
    !names(production).includes("DefinePlugin"),
    "do not inject server environment into the client",
  );
});
