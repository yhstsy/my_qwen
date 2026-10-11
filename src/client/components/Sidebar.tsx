import type {
  Conversation,
  DialogKind,
  Mode,
  PanelName,
  Task,
} from "../types.ts";
import { Icon, IconButton } from "./Icon.tsx";

export function History({
  conversations,
  currentId,
  query = "",
  onOpen,
  onDelete,
}: {
  conversations: Conversation[];
  currentId?: string;
  query?: string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const filtered = conversations.filter((chat) =>
    chat.title?.toLowerCase().includes(query.toLowerCase()),
  );
  if (!filtered.length)
    return (
      <p className="empty-history">{query ? "没有找到相关对话" : "暂无对话"}</p>
    );
  return (
    <>
      <div className="history-caption">历史对话</div>
      {filtered.map((chat) => (
        <div
          className={`history-item${chat.id === currentId ? " active" : ""}`}
          key={chat.id}
        >
          <button
            className="history-open"
            title={chat.title}
            onClick={() => onOpen(chat.id)}
          >
            {chat.title}
          </button>
          <IconButton
            className="history-delete"
            icon="close"
            label={`删除对话：${chat.title}`}
            onClick={() => onDelete(chat.id)}
          />
        </div>
      ))}
    </>
  );
}
interface Props {
  mode: Mode;
  inert: boolean;
  conversations: Conversation[];
  currentId?: string;
  tasks: Task[];
  onHome: () => void;
  onToggle: () => void;
  onMode: (mode: Mode) => void;
  onPanel: (panel: PanelName) => void;
  onDialog: (kind: DialogKind) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onTask: (task: Task) => void;
  onSettings: (anchor: HTMLElement) => void;
}
export function Sidebar(p: Props) {
  const nav = (label: string, icon: string, panel: PanelName) => (
    <button className="nav-item" onClick={() => p.onPanel(panel)}>
      <Icon name={icon} />
      {label}
    </button>
  );
  return (
    <aside className="sidebar" aria-label="侧边栏" inert={p.inert}>
      <div className="sidebar-header">
        <button
          className="brand"
          aria-label="千问，返回首页"
          onClick={p.onHome}
        >
          <img src="/assets/wordmark.svg" width="38" height="20" alt="千问" />
        </button>
        <IconButton
          className="collapse-button"
          icon="sidebar"
          label="收起侧边栏"
          onClick={p.onToggle}
        />
      </div>
      <div className="mode-switch" role="tablist" aria-label="对话模式">
        {(["daily", "work"] as const).map((mode) => (
          <button
            role="tab"
            key={mode}
            aria-selected={mode === p.mode}
            onClick={() => p.onMode(mode)}
          >
            {mode === "daily" ? "日常" : "工作"}
          </button>
        ))}
      </div>
      <nav className="navigation" aria-label="主要功能">
        <div className="new-chat-row">
          <button className="nav-item" onClick={p.onHome}>
            <Icon name="plus" />
            <span>{p.mode === "work" ? "新任务" : "新对话"}</span>
          </button>
          <IconButton
            icon="search-chat"
            label="搜索对话"
            onClick={() => p.onDialog("search")}
          />
        </div>
        {p.mode === "daily" ? (
          <>
            {nav("云空间", "files", "space")}
            {nav("千问创作", "create", "create")}
          </>
        ) : (
          <>
            {nav("技能", "puzzle", "skills")}
            {nav("连接", "connect", "connect")}
            {nav("项目", "folder", "projects")}
            <button className="nav-item" onClick={() => p.onDialog("download")}>
              <Icon name="monitor" />
              本地工作助理
            </button>
          </>
        )}
        <div className="nav-caption">定时任务</div>
        <button className="nav-item" onClick={() => p.onDialog("task")}>
          <Icon name="plus" />
          新定时任务
        </button>
        <div className="task-list">
          {p.tasks.map((task) => (
            <button
              className="nav-item"
              key={task.id}
              title={task.title}
              onClick={() => p.onTask(task)}
            >
              <Icon name="check" />
              {task.title}
            </button>
          ))}
        </div>
      </nav>
      <div className="history" aria-label="历史对话">
        <History
          conversations={p.conversations}
          currentId={p.currentId}
          onOpen={p.onOpen}
          onDelete={p.onDelete}
        />
      </div>
      <div className="sidebar-footer">
        <button className="nav-item" onClick={() => p.onDialog("about")}>
          <Icon name="info" />
          关于千问
        </button>
        <IconButton
          icon="download"
          label="外观设置"
          onClick={(event) => p.onSettings(event.currentTarget)}
        />
      </div>
    </aside>
  );
}
