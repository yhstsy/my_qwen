# 线上部署记录

- 部署日期：2026-10-11。
- 公开网址：https://my-qwen-weld.vercel.app/
- 平台：Vercel Hobby，项目 `my-qwen`，空间 `yhstsyyhstsy-8295`。
- 源码仓库：https://github.com/yhstsy/my_qwen ，主分支 `main`。
- 发布方式：已关联 GitHub 仓库，推送 `main` 自动触发 Vercel 生产部署；也可通过本机 Vercel CLI 手动上传。
- 运行环境：Node.js `22.x`，构建命令 `npm run build`，静态目录 `dist`；迁移后的服务端入口为 `api/chat.ts` 与 `api/status.ts`。
- 部署管理：https://vercel.com/yhstsyyhstsy-8295/my-qwen/deployments

## 密钥配置

生产环境已设置 `QWEN_API_BASE`、`QWEN_MODEL` 和 Secret 类型的 `QWEN_API_KEY`，模型为 `agnes-2.5-flash`。预览环境没有配置这把 Key。密钥只由服务端读取，没有写入前端或本记录。

`.env`、`.env.local`、`.cache/`、`.vercel/`、`.build/`、`dist/`、`node_modules/` 不应上传 GitHub。webpack 构建只打包前端依赖，并复制 `public/styles.css` 与 `public/assets/`，CLI 登录凭据与临时缓存均已排除上传。公开资源目录不得放密钥或内部文件。

## React + TypeScript + webpack 迁移（2026-10-12）

前端已迁移到 React + TypeScript + webpack，原生 DOM 业务入口已删除，Vite 依赖与配置已移除。Vercel 构建命令仍为 `npm run build`，输出目录仍为 `dist`，API 入口、环境变量与服务端 Key 保持现状。JS 资源改为 `assets/index-<hash>.js`，部署时由 HTML 自动引用；对应的 `.LICENSE.txt` 作为公开许可文件保留。

本轮本地验证通过严格类型检查、18 项自动测试、模拟模型浏览器验收、React Fast Refresh 草稿保留、CSS 自动刷新和 Vercel 生产构建；公开资源及两个函数包未发现实际模型 Key，函数包不含 `.env`。生产依赖审计无漏洞，开发依赖中尚未修复的 `braces` 漏洞及本机访问约束见 [webpack 迁移计划与验收](WEBPACK_MIGRATION_PLAN.md)。以下 TS 和目录调整段落为此前版本的历史记录。

本轮通过推送 main 触发 GitHub 自动部署。提交后的验收需要确认对应提交部署 READY、生产别名指向新部署，并检查首页、指纹 JS/CSS/图片、`/api/status`、私有路径 404 和主要交互；对应结果在任务交付时报告。本地构建成功不能代替线上验收。按当前用户偏好，线上检查不调用真实共享模型。

## TypeScript 源码迁移

前端、服务端、Vercel 入口、脚本与测试源码已迁移到 TS，开启严格类型检查。构建先编译到 `.build/`，再将公开浏览器文件复制到 `dist/`。API 路径、环境变量与本地存储格式保持不变。

迁移验证：8 项回归测试通过；聊天（本地模拟模型）、历史刷新、项目/任务保存、附件选择与发送正常；开发监听能自动编译 TS。Vercel 本地生产构建使用 TypeScript 5.9.3 打包函数，Windows CLI 的 PATH 问题通过本机临时兼容脚本处理，未修改项目运行逻辑。函数配置显式排除 `.env*`，避免本地预构建将密钥文件带入函数包。

本次 TypeScript 发布的线上验收范围为：首页、静态资源、编译产物一致性、API 配置状态与私有文件访问保护。按用户要求，不复测真实共享模型。下方是原 JavaScript 版本的历史验收记录，不代表共享模型当前可用性。

## 源码组织调整

本次发布内容为按 `src/`、`public/`、`scripts/`、`tests/`、`docs/` 分类的源码，以及新增的架构实现文档；根目录 `api/` 保留 Vercel 函数入口。构建命令、输出目录、浏览器资源 URL 与 API URL 保持不变，重新部署时仍使用下方命令。严格类型检查、9 项回归测试、开发监听实测与 Vercel 本地生产构建已通过。线上验收范围仍为页面、静态资源一致性、API 配置及私有路径保护，不调用真实共享模型。职责和数据流见 [架构实现文档](ARCHITECTURE.md)。

## 原 JavaScript 版本验收记录

- 使用不带 Cookie 和授权头的请求访问公开域名：首页、JS、CSS、品牌图标返回 HTTP 200，无需 Vercel 登录。
- `/api/status` 返回 HTTP 200、`configured: true`、正确模型名称；此状态只说明环境变量已经配置。
- `/.env`、`/.env.local`、`/.vercel/project.json`、`/app-server.mjs`、`/IMPLEMENTATION_PLAN.md` 返回 HTTP 404，检查过的响应没有包含真实模型 Key。
- 非法 JSON 请求返回 HTTP 400 和脱敏提示；已修复 Vercel 请求体延迟解析器抛出的 `statusCode: 400` 被误判为 500 的兼容问题。
- 本地 7 项回归测试和构建通过，Vercel 生产构建完成，状态为 READY。
- 浏览器页面正常加载，显示真实模型名；日常/工作模式切换与刷新后的本地历史记录正常。聊天请求可到达服务端，首轮遇到共享服务 HTTP 429，等待限流窗口后重试遇到 55 秒上游超时。前端分别显示限频/额度不足与超时提示，本次没有取得有效模型回复，真实聊天稳定性尚未通过验收。
- 线上非法角色返回 400、超过 24,000 字符返回 413、跨站 Origin 返回 403。

## 更新网站

推荐提交并推送 GitHub 的 main，由已关联的 Vercel 自动部署。CLI 手动发布也可用：在本机项目目录执行以下命令。CLI 登录信息放在被忽略的 `.cache/vercel-cli`；更换电脑需要重新登录并关联项目。

```powershell
npm ci
npm run typecheck
npm test
npm run build
$env:npm_config_cache = 'F:\my-qwen\.cache\npm'
$env:npm_config_registry = 'https://registry.npmjs.org'
npx --yes vercel deploy --prod --yes --scope yhstsyyhstsy-8295 --global-config .cache/vercel-cli
```

修改 Vercel 环境变量后也需要重新部署。成功后公开域名保持不变。main 的新提交自动触发生产部署，其他分支可触发 Preview；预览环境未配置生产共享 Key，无需把 Key 提交到仓库。

## 当前边界

本次只发布现有实现，未执行 [功能实施计划](IMPLEMENTATION_PLAN.md) 的功能改造。登录、后台定时任务等原有占位功能仍保留原行为。共享 Key 的额度和限频会影响真实聊天可用性，部署成功不代表供应商随时可调用。

本次使用免费域名和免费项目，没有购买套餐或域名。未验证中国大陆各地区、不同运营商的访问质量。
