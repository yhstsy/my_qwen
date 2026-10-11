# 千问网站界面复刻

参照 [千问官网](https://www.qianwen.com/) 2026-10-11 可见的桌面首页与工作模式制作。使用原生 HTML、CSS 和 TypeScript，Node.js 提供本地服务，无第三方业务运行依赖。TypeScript 和 Node.js 类型定义仅作为开发、构建依赖。

**在线体验：[打开千问助手](https://my-qwen-weld.vercel.app/)**。已部署到 Vercel；当前共享模型可能因额度或限频返回 429，详细验收与更新方法见 [部署记录](docs/DEPLOYMENT.md)。项目组织、请求流程与实现边界见 [架构实现文档](docs/ARCHITECTURE.md)，后续功能方案见 [实施计划](docs/IMPLEMENTATION_PLAN.md)。

## 启动

需要 Node.js 22.x。首次使用先安装锁定的开发依赖：

```powershell
npm ci
npm run dev
```

打开 http://127.0.0.1:5173 。如端口被占用，可在 `.env` 中修改 `PORT`。

`npm run dev` 会先编译，然后监听 TS 改动；修改前端代码后刷新页面即可，服务端改动会自动重启。`npm start` 用于一次构建后启动，不监听文件。现有 `qwen-*` 本地存储键名与数据格式保持不变。

| TypeScript 源码 | 用途 |
| --- | --- |
| `src/app.ts`、`src/chat.ts` | 页面交互、共享消息类型、输入校验与安全渲染 |
| `src/app-server.ts`、`api/*.ts` | Node 服务与 Vercel 函数入口 |
| `scripts/build.ts`、`scripts/dev.ts` | 静态资源构建与开发监听 |
| `tests/chat.test.ts`、`scripts/check-api.ts` | 自动测试与手动真实接口探测 |

`public/` 保存 HTML、CSS 和图片；`tests/fixtures/` 保存测试样本；`docs/` 保存架构、部署记录和后续实施计划。根目录只保留项目说明、工程配置和平台要求的入口目录。

`tsconfig.json` 开启 `strict`。编译中间文件写入 `.build/`；`dist/` 仅包含 HTML、CSS、浏览器 JS 和图片。浏览器无法直接执行 TS，因此继续通过 `/app.js`、`/chat.js` 加载编译后的代码。上述生成目录均不提交 Git。

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

## LMSpeed 共享 Key 实测

2026-10-11，在 [LMSpeed 免费 API Key 页面](https://lmspeed.net/zh/free-api-keys)登录后测试了当时 5 个标记“可用”的条目，每个消耗 20 积分，共 100 积分，余额从 130 变为 30。完整 Key 未写入本文或前端。

| 服务商 / 脱敏条目 | 实测结果 |
| --- | --- |
| `api.senseaudio.cn` / `sk-Hii***D5Dd` | `/models` 返回成功；聊天返回 HTTP 400，提示计费账户被冻结 |
| `api.agnes-ai.cn` / `sk-rbx***C8SX` | `/models` 返回成功；起初多次 HTTP 429（今日文本额度已用完、每分钟限速一次），等待限流窗口后随机暗号及加法验证成功；可临时使用 |
| `larprouter.com` / `lrsk-6***650d` | `/models` 返回 HTTP 401 |
| `ai.furry.vg` / `sk-BrP***mwzI` | `/models` 返回 HTTP 403 |
| `larprouter.com` / `lrsk-5***b0a8` | `/models` 返回 HTTP 401 |

以上是当时实测，不代表这些服务商的全部 Key。Agnes 的 `agnes-2.5-flash` 已通过命令行随机暗号上下文测试，以及网页端真实回复验证（返回“柚子642”，正确计算 `28 + 35 = 63`）。当前本地 `.env` 配置了这个临时接口；它是 Agnes 模型，并非通义千问模型。共享 Key 本身会被其他领取者看到；即使你的网站保密，也无法把共享 Key 变成私有密钥。LMSpeed 也说明共享资源可能限速、失效，不建议用于生产。长期公开服务应使用你自己创建、可撤销和设限的密钥。

## 验证与构建

```powershell
npm run typecheck
npm test
npm run build
```

`npm test` 会先完整编译，再运行编译后的 TS 测试。`dist/` 是静态页面。需要真实对话时应通过 `npm start` 使用 Node 服务，或按上面的 Vercel 方案同时部署 `api/` 函数，不要只发布静态文件。

## 边界

此项目并非千问官方网站，品牌与参考图片归原权利方所有。账号登录、云同步、生图、生视频、PPT 文件生成、第三方应用连接及后台定时任务未接入官方服务。PDF、Office、图片等附件仅展示文件记录，不会声称已解析；仅纯文本附件支持作为对话输入。云空间只保存文件元数据，文件本身不会持久化上传。历史记录位于当前浏览器 localStorage，清理浏览器数据后会丢失。真实 API 调用会将当前对话及可读文本附件发给配置的模型服务。
