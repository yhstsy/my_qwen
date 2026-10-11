# React + TypeScript + webpack 迁移计划

日期：2026-10-12。用户已授权：制定计划、执行迁移、验证通过后提交并推送 main。main 已关联 Vercel，推送会自动触发生产部署。

## 1. 目标与边界

保留本地已完成的 React 组件、hooks、现有界面、qwen-* 本地记录、模型 API 和服务端环境变量，将 Vite 工具链完整替换为 webpack。上一轮尚未提交的 React 改动纳入本轮最终提交。真实共享模型不参与验证；后续认证、研究、技能与后台任务计划继续暂停。

## 2. 实施步骤

| 阶段 | 改动 | 验收 |
| --- | --- | --- |
| A 基线 | 核对 main、远端、工作区；备份当前构建包与源码清单 | 保留用户已有修改，确认发布范围 |
| B 依赖 | 移除 Vite/React Vite 插件，锁定 webpack、Babel、开发服务器和 React Refresh | npm 安装成功，检查兼容要求与依赖审计 |
| C 生产构建 | 新增 webpack.config.ts；TS/TSX 经 Babel 转换，HtmlWebpackPlugin 注入脚本，CopyWebpackPlugin 复制公开资源 | 输出 dist；指纹 JS、压缩、旧产物清理；无开发运行时或源码映射 |
| D 开发服务 | webpack-dev-server + React Refresh；保留 TS 检查监听与 Node API 自动重启，同源代理 /api | 页面可用、组件更新保留草稿、CSS 更新、API Origin 校验、停止后无监听端口 |
| E 测试 | 更新构建测试，增加开发/生产配置隔离与私有产物保护检查 | 类型检查、自动测试、模拟模型浏览器主流程通过 |
| F 部署兼容 | Vercel 本地生产构建、源码/静态包/函数包密钥扫描 | 两个 Node 函数可打包；无实际 Key、.env、测试或缓存公开暴露 |
| G 文档发布 | 更新 README、架构、部署说明及历史计划；检查差异，提交并推送 main | 远端 main 与本机提交一致；检查自动部署状态及可用静态页面 |

## 3. 实现选择

- webpack 配置和工程脚本继续使用 TypeScript，由 tsc 编译后调用 webpack Node API，无需额外 CLI 或 TS 执行器。
- Babel 只负责 TS/TSX 语法转换与 JSX；类型正确性继续由 strict tsc 检查。开发监听显示类型诊断，构建/测试/提交前类型检查必须通过。
- React Refresh 的 Babel 插件和 webpack 插件仅在 development 启用；生产使用 production 模式、外部 defer 脚本和 contenthash，兼容现有 CSP。
- 保留原 CSS 与图片公开路径；HTML 成为 HtmlWebpackPlugin 模板，删除直接加载 TSX 的 script。
- 不把整个 process.env 注入前端，模型 Key 不经过 DefinePlugin；Node 继续读取 .env/平台环境变量。
- webpack-dev-server 只提供编译产物，关闭项目目录静态托管，代理保留 Host，默认仍是网站 5173、API 5174。
- 保留已有 React 功能测试，使用本机模拟供应商验证会话、取消、错误和附件；不复测真实共享服务。

## 4. 风险与处理

- TS 的 NodeNext 与 webpack 转换职责不同：Node 脚本仍由 tsc 编译，Babel 保留 ES 模块供 webpack 解析。
- 开发热更新和生产构建分别验证；生产包不得包含 Refresh/HMR 客户端或 eval。
- webpack 提取的第三方许可文件随产物发布，保持许可证可读取。
- API 代理需验证 Origin，不以关闭校验绕过问题。
- push 前先 fetch 并检查远端；若 main 有新增提交则正常整合，不强推、不覆盖用户改动。
- 推送自动部署可能受平台权限、额度或供应商状态影响，分别记录代码推送、部署状态和模型可用性。
- 截至验收，`braces` 最新 3.0.3 存在未修复的 glob 栈溢出漏洞；完整审计沿 `braces → micromatch → http-proxy-middleware → webpack-dev-server → Refresh 插件` 报告 5 个 high 条目。生产依赖审计为 0 漏洞。开发服务仅监听 127.0.0.1，API 用函数匹配，复制/监听模式固定，不向用户开放 glob 输入；这是暴露面限制，不能替代上游补丁。不使用 `npm audit fix --force` 所建议的过时开发服务器降级。

## 5. 验收记录

| 检查 | 实际结果 |
| --- | --- |
| 类型与构建 | `npm run typecheck`、`npm run build` 通过；生产编译无警告；JS 约 257 KiB，保留第三方许可文件 |
| 自动测试 | `npm test` 18/18 通过，覆盖原 API 与安全边界、旧本地记录、生成取消竞态、React 转义、webpack 开发/生产隔离 |
| 原有资源 | CSS 与 6 个图片资源与 Git 基线一致（文本资源仅忽略 CRLF 差异）；本地存储键名与结构不变 |
| 开发服务 | 页面加载、API status、同源代理未配置时返回 503；React 标题修改即时生效且草稿保留；CSS 修改自动刷新并显示新样式；测试标记均已恢复 |
| 生产包浏览器 | 本机模拟聊天、复制、历史刷新恢复、停止慢回复、429 提示与重试、工作模式、项目选择、文本附件内容、390×844 手机抽屉正常；控制台无 warn/error |
| 开发进程 | 停止测试服务后，5183、5185、5186 无残留监听 |
| 平台构建 | `vercel build --prod` 成功；Node 22 函数 chat/status 均可打包，Windows CLI PATH 兼容仅使用忽略的本机脚本 |
| 发布边界 | 源码、dist 与两个函数包未发现实际 Key；无 `.env`；生产 JS 无 Refresh、开发客户端、eval 或 sourcemap |
| 依赖审计 | `npm audit --omit=dev` 为 0 漏洞；完整审计的开发依赖风险见上文 |

代码通过本地验收后提交并推送 main；提交 SHA、远端一致性、Vercel 自动部署和生产别名检查在任务交付时报告，避免将尚未运行的线上验收写成已完成。发布前仍需核对暂存文件、Git 历史密钥扫描和远端基线，不强推。

本轮没有调用真实共享模型，没有实机验证中文输入法或麦克风，没有进行完整跨浏览器与公网网络质量测试。认证、深度研究、后台任务等后续功能计划仍暂停。

参考：[webpack TypeScript](https://webpack.js.org/guides/typescript/)、[开发服务器](https://webpack.js.org/configuration/dev-server/)、[React Refresh 插件](https://github.com/pmmmwh/react-refresh-webpack-plugin)、[Babel TypeScript](https://babeljs.io/docs/babel-preset-typescript)、[braces 官方安全公告](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)。
