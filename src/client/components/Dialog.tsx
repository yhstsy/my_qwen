import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Conversation, DialogKind, Task } from "../types.ts";
import { History } from "./Sidebar.tsx";
import { Icon, IconButton } from "./Icon.tsx";

interface Props {
  kind: DialogKind;
  model: string;
  task: Task | null;
  conversations: Conversation[];
  currentId?: string;
  onClose: () => void;
  onLocalLogin: () => void;
  onTask: (task: Omit<Task, "id">) => void;
  onProject: (title: string) => void;
  onOpen: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onVoice: () => void;
  notify: (message: string) => void;
}
export function Dialog(p: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return createPortal(
    <dialog
      className="dialog"
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        p.onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const rect = ref.current!.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            p.onClose();
        }
      }}
    >
      <div>
        {["login", "download", "about"].includes(p.kind) && (
          <img className="dialog-logo" src="/assets/qwen.svg" alt="千问" />
        )}
        {p.kind === "login" && (
          <>
            <h2 className="center">欢迎使用千问</h2>
            <p className="center">登录，开启你的 AI 助手之旅</p>
            <button className="primary-button full" onClick={p.onLocalLogin}>
              体验本地模式
            </button>
            <a
              className="secondary-button full"
              href="https://www.qianwen.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              前往千问官网登录
            </a>
            <p className="fine-print">
              这是界面复刻演示，使用本地模式无需账号。
              <br />
              对话仅存储在当前浏览器，不会同步至千问账号。
            </p>
          </>
        )}
        {p.kind === "download" && (
          <>
            <h2 className="center">千问，随时在你身边</h2>
            <p className="center">在电脑和手机上，让灵感与效率更进一步。</p>
            <a
              className="primary-button full"
              href="https://www.qianwen.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="download" />
              前往官网获取客户端
            </a>
            <p className="fine-print">
              请从千问官网选择并下载适合你设备的版本。
            </p>
          </>
        )}
        {p.kind === "about" && (
          <>
            <h2 className="center">关于千问</h2>
            <p className="center">
              你好，我是千问。
              <br />
              让每一个问题，都有新的可能。
            </p>
            <p>
              本项目参照千问网站制作，用于界面学习和交互演示，并非千问官方网站。品牌和参考图片归原权利方所有。
            </p>
            <p className="fine-print">
              {p.model ? `已配置模型：${p.model}` : "当前为本地演示模式"} ·
              对话保存在当前浏览器
            </p>
          </>
        )}
        {p.kind === "task" && (
          <>
            <h2>新定时任务</h2>
            <p>记录想让千问帮你完成的事。</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const time = String(data.get("time") ?? "");
                if (
                  !Number.isFinite(new Date(time).getTime()) ||
                  new Date(time).getTime() <= Date.now()
                ) {
                  p.notify("请选择未来的提醒时间。");
                  return;
                }
                p.onTask({
                  title: String(data.get("title") ?? ""),
                  content: String(data.get("content") ?? ""),
                  time,
                });
              }}
            >
              <label className="form-field">
                任务名称
                <input
                  name="title"
                  placeholder="例如：整理每周工作总结"
                  required
                  maxLength={60}
                />
              </label>
              <label className="form-field">
                任务内容
                <textarea
                  name="content"
                  placeholder="详细描述你的任务"
                  required
                  maxLength={2000}
                />
              </label>
              <label className="form-field">
                提醒时间
                <input name="time" type="datetime-local" required />
              </label>
              <button className="primary-button full" type="submit">
                保存到本地
              </button>
              <p className="fine-print">
                本地演示仅保存任务，不会在后台自动执行或推送提醒。
              </p>
            </form>
          </>
        )}
        {p.kind === "project" && (
          <>
            <h2>新建工作项目</h2>
            <p>为相关任务创建一个专属空间。</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const title = String(
                  new FormData(event.currentTarget).get("title") ?? "",
                ).trim();
                if (title) p.onProject(title);
              }}
            >
              <label className="form-field">
                项目名称
                <input
                  name="title"
                  placeholder="例如：品牌设计、毕业论文"
                  required
                  maxLength={60}
                />
              </label>
              <button className="primary-button full" type="submit">
                创建项目
              </button>
            </form>
          </>
        )}
        {p.kind === "search" && (
          <>
            <h2>搜索对话</h2>
            <input
              className="search-input"
              placeholder="搜索历史对话"
              aria-label="搜索历史对话"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div>
              <History
                conversations={p.conversations}
                currentId={p.currentId}
                query={query}
                onOpen={p.onOpen}
                onDelete={p.onDeleteChat}
              />
            </div>
          </>
        )}
        {p.kind === "voice" && (
          <>
            <h2>语音输入</h2>
            <p>使用麦克风，将你的想法转成文字。</p>
            <button className="primary-button full" onClick={p.onVoice}>
              <Icon name="mic" />
              开始语音输入
            </button>
            <p className="fine-print">
              开始后浏览器会请求麦克风权限。语音识别由浏览器提供，可能使用浏览器厂商的在线服务。
            </p>
          </>
        )}
        {p.kind === "task-detail" && p.task && (
          <>
            <h2>{p.task.title}</h2>
            <p>{p.task.content}</p>
            <p>计划时间：{p.task.time.replace("T", " ")}</p>
            <p className="fine-print">本地记录，不会在后台自动执行。</p>
            <button
              className="secondary-button full"
              onClick={() => p.onDeleteTask(p.task!.id)}
            >
              删除任务
            </button>
          </>
        )}
      </div>
      <IconButton
        className="dialog-close"
        icon="close"
        label="关闭弹窗"
        onClick={p.onClose}
      />
    </dialog>,
    document.body,
  );
}
