# 千问 web app 复刻

参照 [千问官网](https://www.qianwen.com/) 制作，使用 TypeScript 语言进行开发，Node.js 提供本地服务，无第三方业务运行依赖。

**在线体验：[打开千问助手](https://my-qwen-weld.vercel.app/)**。已部署到 Vercel；当前共享模型可能因额度或限频返回 429，详细验收与更新方法见 [部署记录](docs/DEPLOYMENT.md)。项目组织、请求流程与实现边界见 [架构实现文档](docs/ARCHITECTURE.md)。

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
