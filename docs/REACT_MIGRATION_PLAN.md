# React 完整迁移计划

> 历史记录：以下为上一轮 React + Vite 本地迁移方案和当时验收。本轮已按用户要求切换到 React + TypeScript + webpack；当前配置、依赖风险和验收以 [webpack 迁移计划](WEBPACK_MIGRATION_PLAN.md) 与 [架构文档](ARCHITECTURE.md) 为准。

目标：将现有单页交互完整迁移为 React + TypeScript + Vite，保留视觉设计、现有功能与模型 API。用户已确认本轮制定计划并执行迁移。后续认证、深度研究和后台任务计划继续暂停；真实共享模型不参与本轮测试。

## 1. 基线与兼容约束

- 以本轮开始时的仓库为基线，保留现有 README 内容与其他用户修改。
- CSS、图片、品牌、功能名称与演示提示保持现状。
- `qwen-conversations`、`qwen-files`、`qwen-projects`、`qwen-tasks`、`qwen-theme` 保留键名及数据格式，直接读取旧记录。
- `/api/chat`、`/api/status` 的路径、请求/响应和服务端密钥配置保持不变。
- 保留 Node API 与根目录 `api/` 入口，不迁移 Go，不执行数据库或认证接入。
- Vite 生成的浏览器资源可采用构建指纹文件名；这是内部资源地址调整，不改变站点入口与业务 API。

## 2. 目标组织

```text
index.html                    # Vite HTML 入口
src/client/
  main.tsx                    # React 根节点与 StrictMode
  App.tsx                     # 页面状态与组件协调
  types.ts                    # 浏览器数据类型
  data.ts                     # 工具、面板、轮播等静态定义
  state.ts                    # 不可变会话更新、历史上下文与存储读取
  components/                 # Sidebar、Composer、Conversation、Panels、Dialog、Popover、Icon
  hooks/                      # 会话生成、持久化、主题与语音生命周期
src/app-server.ts             # 保留 API；本地静态服务读取 dist
src/chat.ts                   # 共享校验与安全 Markdown
public/styles.css + assets/   # 原样复用
scripts/                      # Vite 构建与双进程开发服务
tests/                        # API、构建、状态、生成竞态与组件回归
```

组件与状态使用 React 内置能力，不为单页增加路由或全局状态库。共享逻辑继续为纯 TS；组件仅通过 props 和回调交互。浏览器代码不得引用服务器模块或读取模型 Key。

## 3. 实施顺序与完成条件

| 阶段 | 工作 | 完成条件 |
| --- | --- | --- |
| A 工具链 | 安装并锁定 React/Vite，配置 TSX、开发代理、生产构建与静态服务 | 类型检查通过；dev/start/build 命令可用；Vercel 构建目录仍为 dist |
| B 页面组件 | 迁移侧栏、顶部栏、首页、轮播、输入框、消息、功能面板、弹窗与菜单 | 页面由 React JSX 渲染；原 CSS 类与响应式布局保留 |
| C 状态与数据 | 迁移会话、附件、项目、任务、主题、选中项与浏览器持久化 | 旧数据可读；刷新保留数据；无直接 DOM 业务状态写入 |
| D 异步生命周期 | 迁移模型请求、逐字展示、停止/重试、语音与定时器 | 中止后无过期写入；切换会话不串内容；卸载清理；StrictMode 不重复副作用 |
| E 交互细节 | 中文输入、键盘菜单、焦点、复制、拖放、滚动、移动抽屉 | 现有操作可用；表单和菜单具备标签、焦点及 Escape 行为 |
| F 验证 | 保留 API 测试，增加状态/生成竞态/React 组件验证；浏览器实测 | 类型、测试、构建通过；本地模拟模型完成主要流程；无控制台错误 |
| G 文档与交付 | 更新 README、架构和部署文档，记录实际验证及未验证项 | 文档与实现一致；生产包无源码、密钥、测试或缓存；本地开发服务清理 |

本轮先完成代码和本地生产构建验收。提交、推送或线上发布按用户的发布指令处理，避免未经本轮发布请求的推送自动更新已关联 Vercel 的生产站点。

## 4. 关键实现规则

- 可变界面数据进入 React state；会话采用不可变更新，当前会话从 ID 派生。
- 生成过程绑定会话 ID、消息位置与独立 AbortController；旧请求和旧计时器不能覆盖新一轮生成。
- 定时器、窗口监听、媒体查询、语音识别、状态请求在 effect 清理中释放；开发 StrictMode 验证重复装卸。
- 读取历史时保留旧可选字段；持久化在更新时完成，停止生成后保存当前结果。
- 模型输出只经过现有安全渲染函数进入受控 HTML；文件名、项目名、提示等使用 JSX 自动转义。
- 对话输入框保持受控值，Enter/Shift+Enter 与中文 composition 协同；文件选择和拖放复用同一处理入口。
- 本地生产服务只提供 dist 的允许资源，拒绝目录穿越、源码、环境文件与文档访问。
- Vite 不使用 `VITE_` 模型密钥，不把整个 `process.env` 注入浏览器；函数继续排除 `.env*`。

## 5. 验收清单

- [x] npm run typecheck / npm test / npm run build 通过（17 项自动测试）。
- [x] 日常/工作布局、深浅主题、菜单、弹窗、轮播及手机抽屉正常。
- [x] 旧格式由 reducer/上下文测试验证；浏览器新建、打开、搜索、刷新和项目/任务记录正常；删除逻辑经状态测试验证。
- [x] 模拟模型发送、停止、重试、429 错误、附件上下文与切换会话正常。
- [x] Enter 发送、Shift+Enter 换行、菜单方向键/Escape/焦点回到触发按钮正常。
- [ ] 真实中文输入法实机验证（已保留 composition 与 native isComposing 防护，自动化浏览器未接入系统输入法）。
- [x] 请求与计时器取消测试通过；StrictMode 开发交互无 React 警告或脚本错误；effect 清理覆盖监听、主题、状态请求、轮播和语音实例。
- [x] 静态资源只含公开内容，私有路径不可读取，构建包无真实 Key。
- [x] Vercel 本地生产构建通过；线上发布未执行，真实共享模型未调用。

## 6. 实施与验证结果

完成日期：2026-10-12（实施跨越午夜）。已删除原生 DOM 业务入口，改为 React JSX 组件及内置 state/reducer/hooks；保留现有 CSS 和 6 个图片/图形资源。CSS/SVG 与 Git 基线比较时仅归一化 Windows 换行，图片字节完全相同。原有 API 逻辑、localStorage 键名和字段保持兼容。

- 工具链：React/React DOM 19.3.0、Vite 8.3.4、React 插件 6.1.2、TS 5.9.3。依赖已锁定，安装时 audit 为 0 vulnerabilities。
- 自动测试：原 9 项 API/安全/构建测试改为验证指纹 JS，另增 5 项客户端状态/请求/取消测试和 3 项 React 组件测试，共 17 项通过。供应商使用本机模拟服务与测试 Key。
- 浏览器：生产 dist 配本机模拟供应商，验证聊天、复制、重新生成、停止、切换取消、搜索、刷新历史、文本附件上下文、项目创建、任务保存/刷新、深浅主题、登录弹窗及手机侧栏。开发模式验证演示路径、换行、键盘菜单；控制台未记录 error/warn。
- 热更新：临时修改 Home 标题，页面无需刷新即更新，已输入草稿保留；测试改动随后恢复。开发代理的 Origin 校验与未配置 503 路径通过。
- 构建：Vercel 本地生产构建成功，Node 22 函数入口保持不变；Windows CLI 使用原有本机 PATH 兼容脚本，未加入运行时代码。公开包及函数包扫描无真实 Key，函数包无 .env。
- 文档：README、架构实现、部署说明与暂停的后续功能计划已同步新源码位置。
- 未验证：真实系统中文输入法、麦克风识别、跨浏览器矩阵和线上 React 部署。真实共享模型按用户要求未调用。原有演示功能和供应商额度限制仍存在。

本轮不提交、推送或部署。临时浏览器验收页面和本地服务在验收后关闭；截图为本地模拟配置，不代表线上模型状态。

参考：[React 生命周期](https://react.dev/reference/react/useEffect)、[Vite 开发代理](https://vite.dev/config/server-options)、[Vite 生产构建](https://vite.dev/config/build-options)。
