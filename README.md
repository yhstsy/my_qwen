# 千问 web app 复刻

参照 [千问官网](https://www.qianwen.com/) 制作，前端使用 React + TypeScript + webpack，Node.js 提供模型 API 与本地生产服务。后端使用 Node 标准库，不依赖独立后端框架。

**在线体验：[打开千问助手](https://my-qwen-weld.vercel.app/)**。已部署到 Vercel；当前共享模型可能因额度或限频返回 429，详细验收与更新方法见 [部署记录](docs/DEPLOYMENT.md)。项目组织、请求流程与实现边界见 [架构实现文档](docs/ARCHITECTURE.md)。

## 启动

需要 Node.js 22.15 或更高的 22.x 版本。首次使用先安装锁定的依赖：

```powershell
npm ci
npm run dev
```

打开 http://127.0.0.1:5173 。webpack-dev-server 默认使用 5173，Node API 默认使用 5174，浏览器通过开发服务器同源代理访问 `/api`。如端口被占用，可在 `.env` 中修改 `PORT` 和可选的 `API_PORT`（默认 `PORT + 1`）。

`npm run dev` 会先构建，然后启动 webpack-dev-server、React Fast Refresh、TS 编译监听与 Node API 监听。React 组件修改自动更新，兼容的修改会保留页面状态；CSS 修改自动刷新，服务端改动自动重启。`npm start` 构建后由单个 Node 服务提供 `dist/` 和 API，不监听文件。现有 `qwen-*` 本地存储键名与数据格式保持不变。

| TypeScript 源码 | 用途 |
| --- | --- |
| `src/client/main.tsx`、`App.tsx` | React 入口与页面协调 |
| `src/client/components/`、`hooks/` | 页面组件、模型请求和浏览器生命周期 |
| `src/client/state.ts`、`generation.ts`、`types.ts`、`data.ts` | 会话状态、生成逻辑、类型与静态定义 |
| `src/chat.ts` | 共享消息类型、输入校验与安全渲染 |
| `src/app-server.ts`、`api/*.ts` | Node 服务与 Vercel 函数入口 |
| `scripts/build.ts`、`scripts/dev.ts` | 静态资源构建与开发监听 |
| `webpack.config.ts` | 开发/生产构建、Babel TSX 转换、HTML 和公开资源 |
| `tests/*.test.ts`、`tests/*.test.tsx` | API、构建、状态竞态和 React 组件回归 |
| `scripts/check-api.ts` | 手动真实接口探测，会消耗模型额度 |

根目录 `index.html` 为 HTML 模板，构建时自动注入 React 入口脚本；`public/` 只保存公开 CSS 和图片；`tests/fixtures/` 保存测试样本；`docs/` 保存架构、部署记录和后续实施计划。完整迁移步骤与验收见 [webpack 迁移计划](docs/WEBPACK_MIGRATION_PLAN.md)，此前方案见 [React 迁移记录](docs/REACT_MIGRATION_PLAN.md)。

`tsconfig.json` 开启 `strict` 与 TSX 支持。编译中间文件写入 `.build/`；webpack 使用 Babel 转换 TS/TSX，由 tsc 检查类型，将前端打包到 `dist/assets/index-<hash>.js`。`dist/` 仅包含公开 HTML、CSS、浏览器 JS、第三方许可文件和图片，生成目录均不提交 Git。生产构建不包含热更新客户端或源码映射。

```powershell
npm run typecheck
npm test
npm run build
```

自动测试使用本地模拟供应商，不调用真实共享模型。当前工具链通过 18 项自动测试、类型检查、开发热更新、浏览器回归和 Vercel 本地生产构建。GitHub 的 `main` 已关联 Vercel，推送会触发生产部署；线上发布结果以对应提交的 Vercel 状态为准。

依赖审计：生产依赖 `npm audit --omit=dev` 无已知漏洞。开发工具间接依赖的 `braces` 存在[尚无修复版本的漏洞](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)，开发服务只监听本机，代理使用固定函数匹配，不接受用户 glob；具体范围与处理见迁移验收记录。

## 已实现

- 参考站的侧边栏、顶部导航、品牌标志、问候语、工具输入框和原版轮播图片。
- 日常与工作模式切换、侧栏收起、手机抽屉、深浅色与跟随系统外观。
- 消息输入、逐字展示、停止生成、复制、重新生成、本地历史持久化、删除与搜索。
- 附件选择、移除与拖入，云空间文件记录；纯文本附件（不超过 100 KB）可作为模型上下文。
- 创作入口、工作技能、项目创建与选择、定时任务本地记录。
- 可选的浏览器语音输入，需浏览器支持并由用户授予麦克风权限。
- `Ctrl/Cmd + K` 搜索对话；`Ctrl/Cmd + Shift + O` 新对话；Enter 发送、Shift + Enter 换行。

## 接入真实模型

没有配置 Key 时使用明确标注的本地演示。将 `.env.example` 复制为 `.env`，填入你有权使用的 API Key 后重启：

```dotenv
QWEN_API_KEY=你的DashScope_API_Key
QWEN_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
PORT=5173
```

API Key 仅在 Node 服务端读取，不会下发到浏览器。服务端使用 OpenAI 兼容的 `/chat/completions` 接口，也可以配置其他兼容服务。接口格式参照[阿里云官方文档](https://www.alibabacloud.com/help/en/model-studio/model-calling-in-sub-workspace)。接入 API 后，顶部与模型菜单显示服务端 `QWEN_MODEL` 的实际配置值；演示模式保留参考站模型菜单。快速/思考选项用于复刻交互，当前不根据菜单开启深度研究。逐字展示是客户端显示效果，服务端暂使用非流式请求。

```powershell
npm run check:api
```

此命令从本机环境读取配置，检查模型列表，并用随机暗号和加法验证真实聊天及上下文。会产生少量 API 用量，不打印密钥或上游错误原文。`/api/status` 的 `configured` 只表示服务端已填写 Key，不代表服务商当前可用。
