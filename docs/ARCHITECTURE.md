# 架构实现文档

本文以当前仓库源码为依据，记录已经实现的结构、运行流程与限制。版本发布范围、线上记录与更新方式见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 1. 组织形式判断

当前采用 React + TypeScript + webpack 的常规单页组织：浏览器代码位于 `src/client/`，按组件、hooks、纯状态逻辑和静态数据分开；HTTP 服务、共享规则和 Vercel 适配入口独立。严格类型检查、锁文件、测试和环境变量隔离已具备。当前没有 URL 路由需求，使用 React 内置状态即可，不增加路由库或全局状态库。服务端仍只有两个接口，保留标准库处理器，待实际增长时再拆分业务模块。

## 2. 目录与职责

```text
my-qwen/
├── src/
│   ├── client/
│   │   ├── main.tsx           # createRoot 与 StrictMode
│   │   ├── App.tsx            # 页面状态、导航和组件协调
│   │   ├── components/       # Sidebar、Home、Composer、Conversation、Panels、Dialog、Popover、Icon
│   │   ├── hooks/            # useChat、useBrowser、useVoice
│   │   ├── state.ts          # 会话 reducer、旧记录读取、上下文组装
│   │   ├── generation.ts     # 请求与可取消的逐字展示
│   │   ├── types.ts          # 浏览器数据契约
│   │   └── data.ts           # 固定图标、工具、轮播和面板定义
│   ├── chat.ts                # 共享消息类型、校验与浏览器安全渲染
│   └── app-server.ts          # HTTP 处理器、模型代理、本地服务入口
├── api/
│   ├── chat.ts                # Vercel /api/chat 适配入口
│   └── status.ts              # Vercel /api/status 适配入口
├── public/
│   ├── styles.css             # 布局、主题与响应式样式
│   └── assets/                # 品牌图形与轮播图片
├── scripts/
│   ├── build.ts               # 调用 webpack 生成公开产物
│   ├── dev.ts                 # webpack、API 代理、编译监听与 Node 自动重启
│   └── check-api.ts           # 手动调用真实服务的诊断脚本
├── tests/
│   ├── chat.test.ts           # 渲染、校验、HTTP、代理与构建回归
│   ├── client.test.ts         # 旧记录、生成竞态和取消计时器
│   ├── components.test.tsx    # React 输出、转义和组件契约
│   ├── webpack.test.ts       # 开发/生产配置隔离
│   └── fixtures/sample.txt    # 手动附件测试样本
├── docs/
│   ├── ARCHITECTURE.md        # 当前实现
│   ├── DEPLOYMENT.md          # 已发布版本记录与部署步骤
│   ├── IMPLEMENTATION_PLAN.md # 暂停中的后续方案
│   ├── REACT_MIGRATION_PLAN.md # 上轮 React 迁移历史记录
│   ├── WEBPACK_MIGRATION_PLAN.md # 当前工具链迁移与验收
│   └── preview.jpg            # 界面参考截图
├── .env.example              # 无密钥的配置模板
├── .gitignore
├── .vercelignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── webpack.config.ts
├── index.html                # HtmlWebpackPlugin 模板
├── vercel.json
└── README.md
```

`.build/` 是 TS 编译中间目录；前端生产代码由 webpack 从源码单独打包。`dist/` 只包含 `index.html`、`styles.css` 和 `assets/`，JS 带构建指纹。以上生成目录均不提交 Git。`.cache/` 保存本机临时验证和 CLI 数据，`.vercel/` 保存平台关联及本地函数产物，也不公开发布。

| 模块 | 主要入口 | 职责与依赖 |
| --- | --- | --- |
| [App.tsx](../src/client/App.tsx) | React 根组件 | 组合组件和 hooks；依赖 React、浏览器 API、共享 `chat.ts`，调用同源 HTTP 接口 |
| [state.ts](../src/client/state.ts)、[generation.ts](../src/client/generation.ts) | reducer、上下文和请求 | 不变更 DOM；隔离会话与生成 ID，支持本地模拟测试 |
| [chat.ts](../src/chat.ts) | `ChatMessage`、`validateMessages`、`renderMessage`、`formatSize` | 无环境依赖，不读取密钥；浏览器和服务器可共同引用 |
| [app-server.ts](../src/app-server.ts) | `createAppHandler`、`createAppServer`、`resolvePublicPath` | 依赖 Node 内置模块、`chat.ts` 与原生 `fetch`；读取服务端配置 |
| [api/chat.ts](../api/chat.ts)、[api/status.ts](../api/status.ts) | 默认导出的 HTTP 处理器 | 只适配 Vercel，复用同一个处理器，不复制模型调用逻辑 |
| [build.ts](../scripts/build.ts)、[dev.ts](../scripts/dev.ts) | 编译后由 npm 命令启动 | 管理公开产物与开发进程，不参与浏览器业务 |

依赖方向为浏览器/服务器分别依赖共享模块，平台入口依赖服务器。浏览器不能导入服务器模块；服务器不依赖页面交互代码。当前通过明确的 import、webpack 入口和产物测试维持边界，未配置自动架构依赖检查器。

## 3. 运行架构

```mermaid
flowchart LR
    Browser[浏览器：单页界面] -->|读写| Storage[当前来源的 localStorage]
    Browser -->|HTML / CSS / JS / 图片| Static[Vercel 静态托管：dist]
    Browser -->|同源 /api/status 与 /api/chat| Entry[根目录 api：平台入口]
    Entry --> Handler[src/app-server.ts：共享处理器]
    Local[本地 Node HTTP 服务] --> Handler
    Handler -->|仅本地生产静态请求| Files[dist 公开文件白名单]
    Handler -->|服务端 Bearer Key / 非流式请求| Model[配置的模型供应商]
```

生产环境由 Vercel 托管静态文件，并运行两个 Node 函数；`npm start` 由一个 Node HTTP 服务提供 dist 与 API。开发时 webpack 提供页面和热更新，将 `/api` 代理给第二个本地 Node 端口。`api/` 保留在根目录以适配 Vercel 自动发现约定。业务代码不绑定 Vercel SDK，也没有数据库、登录认证服务器或后台队列。

## 4. 页面状态与本地数据

`App.tsx` 使用 React state 协调日常/工作模式、面板、菜单、弹窗、附件和侧栏。展示组件通过 props 和回调交互；`useChat` 管理会话 reducer、请求、逐字展示与持久化，`useBrowser` 管理主题/存储/配置状态，`useVoice` 管理浏览器语音识别。当前会话从 ID 派生，不维护第二份消息副本。页面没有独立路由或全局状态库。

业务视图全部由 JSX 渲染，已删除旧 `src/app.ts` 和 `public/index.html`，不存在挂载旧 DOM 脚本的桥接。ref 仅用于文本框尺寸、焦点、滚动、原生 dialog、文件选择与语音等浏览器能力；菜单和弹窗通过 React portal 挂载到 body。受控输入同时检查 composition 状态，避免中文组词时 Enter 误发送。

| localStorage 键 | 数据 | 持久化边界 |
| --- | --- | --- |
| `qwen-conversations` | 会话 ID、标题、模式、时间和消息数组 | 消息可含附件名称、可读文本与工具标签 |
| `qwen-files` | 文件 ID、名称、大小、MIME 类型和日期 | 仅文件元数据，不保存原文件；写入时保留最近 100 条 |
| `qwen-projects` | 项目 ID、标题 | 当前选中项目只在内存中，尚未建立会话归属 |
| `qwen-tasks` | 任务 ID、名称、内容、计划时间 | 仅本地记录，没有后台执行或提醒 |
| `qwen-theme` | 浅色、深色或跟随系统 | 页面刷新后恢复 |

存储属于当前浏览器及网站来源，没有账户身份或跨设备同步。本次保留全部键名与数据结构，不执行数据迁移。读取时捕获 JSON 解析失败，写入失败会提示存储空间不足；当前并未对每类历史数据进行完整运行时 schema 校验。

附件处理最多接受 5 个、每个不超过 10 MB。只有 `.txt`、`.md`、`.csv`、`.json` 且大小不超过 100,000 字节的文件通过 `File.text()` 读取；其他附件保留名称并说明未解析。文件选择器仍列有 PDF、Office 和图片等类型，严格收窄白名单属于后续计划。

## 5. 一次对话的实现流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant B as React / useChat
    participant L as localStorage
    participant A as /api/chat
    participant M as 模型供应商
    U->>B: 提交文本和附件
    B->>L: 保存用户消息
    B->>B: 最近 40 条消息 + 可读附件文本
    B->>A: POST {messages, mode, tool}
    A->>A: Origin、请求体、角色及总量校验
    A->>M: 系统指令 + messages，stream=false
    M-->>A: 完整模型结果或错误
    A-->>B: {content} 或脱敏 {error}
    B->>B: 转义渲染，定时逐字展示
    B->>L: 保存助手消息
```

初始化时浏览器请求 `/api/status`。配置存在时展示服务端模型名；配置缺失或检查失败时保留本地演示路径。当前状态检查没有主动调用供应商，也存在请求尚未结束时用户即可发送的竞态，不能把 `configured: true` 理解为模型可用性检查。

发送时创建或复用本地会话，截取最近 40 条已有消息，并将可读附件文本拼入相应消息。服务端只使用 `messages`；客户端携带的 `mode`、`tool` 当前不改变模型执行策略。共享系统指令由服务端添加，调用方不能直接发送 `system` 角色替换它。

上游请求返回完整文本后，浏览器每 22 ms 追加部分字符，因此当前是非流式接口加逐字显示，没有 SSE/WebSocket。停止生成会中止浏览器请求并停止显示；服务端监听连接关闭并尝试取消上游调用，不能保证供应商已经停止计费。

每次生成绑定独立 ID、会话 ID 和助手消息位置。reducer 只接受当前生成 ID 的文本与完成事件。切换/新建会话或停止时同时中止 AbortController、清理逐字计时器，保留已生成内容；还没有文本时记为“已停止生成。”。旧请求即使晚到也不能覆盖新会话。组件卸载时清理状态请求、监听、轮播、通知计时器和语音实例。开发入口启用 StrictMode，检查 effect 重复装卸后的行为。

没有配置模型时生成明确的演示说明；配置模型且选择生图/生视频时显示暂不支持文字模型直接生成媒体的说明。其余技能、思考与研究入口尚未接入专属后端流程。

## 6. HTTP 接口与错误

### GET /api/status

返回 `200`，响应为 `{ "configured": true, "model": "模型 ID" }`；未配置 Key 时为 `{ "configured": false, "model": null }`。不返回 Key、Base URL 或认证头。响应使用 `Cache-Control: no-store`。

### POST /api/chat

请求示例：

```json
{"messages":[{"role":"user","content":"你好"}]}
```

成功响应为 `200` 和 `{ "content": "助手回复" }`；错误响应统一为 `{ "error": "可展示的中文说明" }`。参数限制由共享校验和 HTTP 边界共同执行：

| 检查 | 当前规则 |
| --- | --- |
| 请求体 | 最多 64 KiB，必须能解析为 JSON；兼容 Vercel 预解析 body |
| 消息类型 | 非空数组，每条角色只允许 `user`、`assistant`，content 必须是非空字符串 |
| 共享校验上限 | 最多 100 条，单条最多 50,000 个 JavaScript 字符串长度单位 |
| 实际 API 上限 | 最多 40 条，总内容最多 24,000 个 JavaScript 字符串长度单位 |
| 来源检查 | 带 Origin 时必须匹配 `APP_ORIGIN` 或服务端推导的当前来源 |
| 模型参数 | 服务端固定 `stream: false`、`max_tokens: 2048` |
| 上游超时 | 55 秒，生产聊天函数时限配置为 60 秒 |

前端 textarea 的长度限制是 30,000，文本附件也可能超过 API 总量限制。目前以后端校验为最终边界；统一规则属于后续计划。

| HTTP 状态 | 含义 |
| --- | --- |
| 400 | JSON 解析失败或消息格式不正确，包括平台延迟 body 解析错误 |
| 403 | 带有不匹配的 Origin |
| 413 | 请求体、消息条数或内容总量超限 |
| 429 | 上游限频或额度不足；合法数字形式的 Retry-After 会转发 |
| 502 | 上游认证失败、异常响应、连接失败、超时、无有效文本或返回 Key |
| 503 | 服务端未配置模型 Key |
| 404 / 405 / 500 | 未公开路径或文件不存在 / 不支持的方法 / 未分类服务端错误 |

上游地址固定取自服务端 `QWEN_API_BASE`，追加 `/chat/completions`，通过 `Authorization: Bearer ...` 调用。异常原文和上游错误响应不返回浏览器；成功文本若包含当前完整 Key，也会被阻止发送。

## 7. 构建、开发与部署

项目运行在 Node.js 22.15+ 的 22.x 版本。前端依赖 React/React DOM 19.3.0；构建使用 webpack 5.111.1、webpack-dev-server 6.0.0、Babel 7、React Refresh 插件 0.6.3 和 TypeScript 5.9.3，精确版本见锁文件。后端使用 Node 标准库。`tsconfig.json` 开启 strict 与 react-jsx，采用 NodeNext / ES2022，供 Node 执行的 TS 相对导入扩展名重写为 JS。

`webpack.config.ts` 和工程脚本先由 tsc 编译，再通过 webpack Node API 运行，不依赖 webpack CLI 或运行时 TS 加载器。浏览器 TS/TSX 由 babel-loader、preset-typescript 与 preset-react 转换，保留 ES 模块供 webpack 优化；Babel 不做类型检查，`tsc` 负责这一边界。开发监听显示类型诊断，生产构建必须先通过 tsc。

```text
src/ + api/ + scripts/ + tests/ + webpack.config.ts --tsc--> .build/（保留目录层级）
src/client/ + src/chat.ts --Babel + webpack--> dist/assets/index-<hash>.js
index.html --HtmlWebpackPlugin 注入 defer 脚本--> dist/index.html
public/styles.css + public/assets/ --CopyWebpackPlugin--> dist/styles.css + assets/
api/*.ts + src/                        --Vercel 打包--> Node 函数
```

webpack 仅清理并重新生成项目内的 `dist/`，只显式复制 `public/styles.css` 与 `public/assets/`，这些目录必须只放公开文件。测试、文档和服务器源码不会进入浏览器产物。生产使用压缩、contenthash、300 KiB JS 体积预算，不生成 sourcemap，也不加载 Refresh/HMR；第三方 `.LICENSE.txt` 随包发布。开发使用本机 webpack-dev-server 与 React Fast Refresh，CSS/HTML 变更触发刷新。`.vercelignore` 排除密钥文件、本机缓存、生成目录、测试、文档和真实模型诊断脚本；函数的 `excludeFiles: ".env*"` 再排除本地环境文件。

| 命令 | 行为 |
| --- | --- |
| `npm ci` | 按 package-lock 安装依赖 |
| `npm run typecheck` | 严格类型检查，不生成文件 |
| `npm run build` | 编译 TS，再由 webpack 打包 React 与公开资源 |
| `npm run dev` | 先构建，再启动 webpack-dev-server、tsc 监听与 Node API 监听；React 热更新，API 自动重启 |
| `npm start` | 先构建，再启动本地服务，默认只监听 127.0.0.1:5173 |
| `npm test` | 先构建，再运行编译后的 Node 测试 |
| `npm run check:api` | 手动调用真实供应商，会产生模型用量，不属于自动测试 |

本地生产 HTTP 服务只从 `dist/` 读取 HTML/CSS/JS/图片和许可文本。开发默认 webpack-dev-server 5173、Node API 5174；开发服务器关闭项目目录的静态托管，只提供编译资产；API 代理用函数匹配固定的 `/api` 前缀，保留 Host，使 Origin 校验仍可使用浏览器来源。JS 改为构建指纹地址，首页、CSS、图片与两个 API 地址保持不变。生产输出仍为 `dist/`，Vercel 函数入口及部署命令不变。GitHub main 已关联 Vercel，推送触发生产部署，实际发布结果需核对对应提交。

## 8. 配置与安全边界

| 环境变量 | 作用 |
| --- | --- |
| `QWEN_API_KEY` | 模型 Key，只在服务端读取；为空时未配置 |
| `QWEN_API_BASE` | OpenAI 兼容接口地址，默认 DashScope compatible-mode/v1 |
| `QWEN_MODEL` | 模型 ID，默认 qwen-plus |
| `APP_ORIGIN` | 可选，指定允许的浏览器来源；其他反向代理场景应显式配置 |
| `PORT` | 本地网站端口，默认 5173 |
| `API_PORT` | 仅开发代理目标端口，默认 PORT + 1 |

本地服务读取项目根目录 `.env`；Vercel 使用平台注入的环境变量。模板为根目录 `.env.example`。Key 不应进入源码、Git、静态资源、错误文本或文档，生产密钥只配置在服务端环境。

浏览器源码不读取 `process.env`；webpack 配置没有使用 DefinePlugin 将模型 Key 或整个环境注入前端。开发脚本读取环境用于端口及传给 Node API 的服务端配置，模型 Key 仍由 Node 服务读取。

截至本轮检查，生产依赖 `npm audit --omit=dev` 为 0 漏洞。完整审计报告的 5 个 high 条目沿开发代理依赖链指向同一个未修复的 [braces 漏洞 GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)：不可信的深度嵌套 glob 可导致栈溢出。开发服务仅监听 127.0.0.1，代理采用函数匹配，复制/监听模式来自固定配置，不接受网络用户提供的 glob；生产浏览器和 API 不加载该开发工具链。这些约束降低暴露面，不视为依赖漏洞已修复；上游发布修复版本后应更新锁文件并重新审计。

本地静态处理采用文件白名单、URL 解码、目录边界和后缀限制，拒绝路径穿越与源码访问；生产只托管 `dist/`。模型/用户文本先转义再应用有限 Markdown 格式，不执行返回的 HTML。响应设置 CSP、nosniff 和 Referrer-Policy，生产静态响应由 `vercel.json` 设置同类头。

当前没有用户认证、持久化配额或接口限流。Origin 检查无法防止直接 HTTP 客户端调用，公开接口仍会消耗共享额度。已接受的共享 Key 与用量控制边界在本次保持不变。

## 9. 验证方式

测试使用 Node 内置测试框架。模型代理测试连接本机模拟供应商并使用测试 Key，不访问真实共享服务。React 组件通过服务端渲染检查输出与转义，浏览器补充交互和生命周期验收。

- 安全渲染、消息角色与大小校验。
- 静态文件白名单、目录穿越防护，以及源码/文档/配置无法公开访问。
- 指纹 JS 与 HTML 关联、只发布允许资源、移除旧公开产物。
- HTTP 页面与资源访问、未配置模型、超长请求、非法角色和跨站请求。
- 模拟模型成功、认证错误、429 与 Retry-After、密钥回显阻止。
- Serverless 预解析请求体、HTTPS Origin 与延迟 body 解析失败。
- 旧会话/附件结构、不可变更新、停止保留部分内容、旧生成事件不能串写。
- 逐字计时器取消、客户端请求契约、错误提示、演示/媒体路径不发请求。
- React 自动转义、助手安全 Markdown、受控输入与日常/工作组件布局。

本轮通过类型检查、18 项自动测试、浏览器主要交互、React 热更新（草稿保留）、CSS 自动刷新和 Vercel 本地生产构建。公开包及两个函数包未发现实际 Key，函数包不含 `.env`。本轮浏览器再次检查模拟聊天、停止/重试、复制、附件上下文、历史刷新、项目选择、工作模式与手机抽屉；此前 React 迁移还检查了搜索、项目与任务保存、主题和弹窗，记录分别见 [webpack 验收](WEBPACK_MIGRATION_PLAN.md) 与 [React 历史验收](REACT_MIGRATION_PLAN.md)。真实中文输入法、麦克风和跨浏览器矩阵未实机验证。按用户偏好未调用真实共享模型；构建成功和配置状态不能证明供应商实时可用。

## 10. 当前限制与后续落点

| 能力 | 当前实现 | 后续落点（尚未执行） |
| --- | --- | --- |
| 登录 | 本地模式按钮，无真实认证 | 浏览器认证模块与服务端身份校验 |
| 思考、深度研究 | 菜单选择，普通模型代理 | 独立研究流程、搜索证据与任务状态 |
| 工作技能 / PPT | 工具标签，无服务端技能指令和文件生成 | 技能白名单与提示词组合，PPT 大纲 |
| 项目 | 本地名称列表与选择 | 会话归属、项目指令与上下文 |
| 定时任务 | localStorage 记录 | 数据库、调度器、受保护 worker |
| 附件 / 云空间 | 文本上下文与本地文件元数据 | 文本类型统一限制及“本地文件记录”命名 |
| 外部连接 / 本地助理 | 演示说明或外部链接 | 按计划统一未开放提示与外链提示 |

以上扩展实际开始时，在现有 `src/client/` 下增加对应组件/hooks，在 `src/server/` 下拆出实际服务端功能；平台入口保持轻量适配，共享规则保持无环境依赖。数据库和第三方 SDK 只在对应能力落地时引入。方案和验收标准维护在 [功能实施计划](IMPLEMENTATION_PLAN.md)，本轮 React 迁移不执行该计划。
