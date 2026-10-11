import { useCallback, useEffect, useRef, useState } from "react";
import { Composer } from "./components/Composer.tsx";
import type { ComposerMenu } from "./components/Composer.tsx";
import { Conversation } from "./components/Conversation.tsx";
import { Dialog } from "./components/Dialog.tsx";
import { Home } from "./components/Home.tsx";
import { Icon, IconButton } from "./components/Icon.tsx";
import { Panels } from "./components/Panels.tsx";
import { Popover } from "./components/Popover.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { modelNames, toolIcons } from "./data.ts";
import { useApiStatus, useLocalState, useTheme } from "./hooks/useBrowser.ts";
import { useChat } from "./hooks/useChat.ts";
import { useVoice } from "./hooks/useVoice.ts";
import type {
  Attachment,
  DialogKind,
  FileRecord,
  Menu,
  MenuItem,
  Mode,
  PanelName,
  Project,
  Task,
  Theme,
} from "./types.ts";

export function App() {
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const notify = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const chat = useChat(notify);
  const status = useApiStatus();
  const [tasks, setTasks] = useLocalState<Task[]>("qwen-tasks", [], notify);
  const [projects, setProjects] = useLocalState<Project[]>(
    "qwen-projects",
    [],
    notify,
  );
  const [files, setFiles] = useLocalState<FileRecord[]>(
    "qwen-files",
    [],
    notify,
  );
  const [theme, setTheme] = useLocalState<Theme>("qwen-theme", "light", notify);
  useTheme(theme);
  const [mode, setMode] = useState<Mode>("daily");
  const [tool, setTool] = useState("");
  const [speed, setSpeed] = useState("快速");
  const [agentMode,setAgentMode] = useState(false);
  const [model, setModel] = useState(modelNames[0]);
  const [selectedProject, setSelectedProject] = useState("");
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [panel, setPanel] = useState<PanelName | null>(null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [taskDetail, setTaskDetail] = useState<Task | null>(null);
  const [localLogin, setLocalLogin] = useState(false);
  const [menu, setMenu] = useState<Menu | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const [width, setWidth] = useState(() =>
    typeof innerWidth === "number" ? innerWidth : 1280,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [slide, setSlide] = useState(2);
  const [promoClosed, setPromoClosed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const attachmentEpoch = useRef(0);
  const attachmentValue = useRef(attachments);
  attachmentValue.current = attachments;
  const fileQueue = useRef(Promise.resolve());
  const voice = useVoice(setDraft, notify);
  const focusInput = () =>
    requestAnimationFrame(() =>
      inputRef.current?.focus({ preventScroll: true }),
    );
  const clearInput = () => {
    attachmentEpoch.current++;
    attachmentValue.current = [];
    setDraft("");
    setAttachments([]);
  };
  const hideMobile = () => setMobileOpen(false);
  function goHome() {
    chat.select(null);
    setPanel(null);
    clearInput();
    hideMobile();
    closeMenu();
    focusInput();
  }
  function changeMode(value: Mode) {
    setMode(value);
    setTool("");
    goHome();
  }
  function selectTool(value: string) {
    closeMenu();
    if (value === "工作助理") {
      changeMode("work");
      return;
    }
    setTool((current) => (current === value ? "" : value));
    focusInput();
  }
  function openChat(id: string) {
    const item = chat.conversations.find((value) => value.id === id);
    if (!item) return;
    chat.select(id);
    setMode(item.mode || "daily");
    setTool("");
    setPanel(null);
    setDialog(null);
    clearInput();
    hideMobile();
    closeMenu();
    focusInput();
  }
  function showPanel(value: PanelName) {
    chat.stop();
    setPanel(value);
    closeMenu();
    hideMobile();
  }
  function showDialog(kind: DialogKind) {
    closeMenu();
    setDialog(kind);
  }
  function chooseProject(id: string) {
    setSelectedProject(id);
    goHome();
  }
  const upload = () => {
    closeMenu();
    fileRef.current?.click();
  };
  function openMenu(
    anchor: HTMLElement,
    heading: string,
    items: MenuItem[],
    above = false,
  ) {
    setMenu((current) =>
      current?.anchor === anchor ? null : { anchor, heading, items, above },
    );
  }
  function composerMenu(
    kind: ComposerMenu,
    anchor: HTMLElement,
    visibleTools: string[] = [],
  ) {
    if (kind === "model") {
      openMenu(
        anchor,
        status.configured ? "当前服务端模型" : "选择模型",
        (status.configured ? [status.model] : modelNames).map((value) => ({
          label: value,
          icon: "spark",
          selected: value === (status.configured ? status.model : model),
          action: () => setModel(value),
        })),
      );
      return;
    }
    if (kind === "speed") {
      openMenu(
        anchor,
        "回答模式",
        ["快速", "思考", "深度研究"].map((value, index) => ({
          label: value,
          icon: ["bolt", "spark", "research"][index],
          selected: speed === value,
          description: [
            "轻快响应，适合日常交流",
            "深入思考，解决复杂问题",
            "系统梳理，探索更多信息",
          ][index],
          action: () => setSpeed(value),
        })),
        true,
      );
      return;
    }
    if (kind === "more") {
      openMenu(
        anchor,
        "更多工具",
        Object.keys(toolIcons)
          .filter((value) => !visibleTools.includes(value))
          .map((value) => ({
            label: value,
            icon: toolIcons[value],
            selected: tool === value,
            action: () => selectTool(value),
          })),
      );
      return;
    }
    if (kind === "attach") {
      openMenu(
        anchor,
        "支持文档、表格和图片，单个文件不超过 10 MB",
        [{ label: "上传文件或图片", icon: "files", action: upload }],
        true,
      );
      return;
    }
    openMenu(anchor, "工作项目", [
      ...projects.map((project) => ({
        label: project.title,
        icon: "folder",
        selected: selectedProject === project.id,
        action: () => chooseProject(project.id),
      })),
      { label: "新建项目", icon: "plus", action: () => showDialog("project") },
    ]);
  }
  function settings(anchor: HTMLElement) {
    openMenu(
      anchor,
      "外观设置",
      (["light", "dark", "system"] as const).map((value, index) => ({
        label: ["浅色模式", "深色模式", "跟随系统"][index],
        icon: ["sun", "moon", "monitor"][index],
        selected: theme === value,
        action: () => setTheme(value),
      })),
      true,
    );
  }
  function addFiles(incoming: Iterable<File>) {
    closeMenu();
    const chosen = [...incoming];
    const epoch = attachmentEpoch.current;
    fileQueue.current = fileQueue.current
      .then(async () => {
        if (epoch !== attachmentEpoch.current) return;
        const next = [...attachmentValue.current];
        const records: FileRecord[] = [];
        for (const file of chosen) {
          if (next.length >= 5) {
            notify("每次最多添加 5 个附件。");
            break;
          }
          if (file.size > 10 * 1024 * 1024) {
            notify(`“${file.name}”超过 10 MB，暂未添加。`);
            continue;
          }
          const item: Attachment = {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type,
            text: "",
          };
          if (/\.(txt|md|csv|json)$/i.test(file.name) && file.size <= 100000)
            item.text = await file.text();
          if (epoch !== attachmentEpoch.current) return;
          next.push(item);
          records.unshift({
            id: item.id,
            name: item.name,
            size: item.size,
            type: item.type,
            date: new Date().toISOString(),
          });
        }
        attachmentValue.current = next;
        setAttachments(next);
        setFiles((current) => [...records, ...current].slice(0, 100));
      })
      .catch(() => notify("无法读取文件，请重新选择。"));
  }
  function submit() {
    if (chat.busy) {
      chat.stop();
      return;
    }
    const content = draft.trim();
    if (!content && !attachments.length) return;
    chat.send(
      {
        role: "user",
        content: content || "请查看附件",
        files: attachments.map((file) => ({
          name: file.name,
          text: file.text,
        })),
        tool,
      },
      mode,
      status.configured,
      tool,
      speed,
      agentMode && status.agentEnabled ? 'agent' : 'chat',
    );
    setPanel(null);
    clearInput();
    hideMobile();
  }
  function card(value: string) {
    if (value === "更多连接") {
      notify("当前为本地演示，尚未接入外部应用。");
      return;
    }
    goHome();
    if (value === "本地文件") {
      upload();
      return;
    }
    const skills: Record<string, string> = {
      写作助手: "AI写作",
      编程助手: "代码",
      研究助手: "研究",
      翻译助手: "翻译",
      会议纪要: "录音纪要",
      知识资料: "研究",
    };
    selectTool(skills[value] || value);
  }
  const keyboard = useRef({ home: goHome, search: () => showDialog("search") });
  keyboard.current = { home: goHome, search: () => showDialog("search") };
  useEffect(() => {
    const resize = () => {
      setWidth(innerWidth);
      setMenu(null);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
        setMobileOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        keyboard.current.search();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "o"
      ) {
        event.preventDefault();
        keyboard.current.home();
      }
    };
    window.addEventListener("resize", resize);
    document.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("keydown", keydown);
      attachmentEpoch.current++;
    };
  }, []);
  const mobile = width <= 760;
  const toggleSidebar = () => {
    closeMenu();
    if (mobile) setMobileOpen((value) => !value);
    else setCollapsed((value) => !value);
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(
          mobile && !mobileOpen ? ".collapse-button" : ".expand-button",
        )
        ?.focus(),
    );
  };
  const modelLabel = status.configured ? status.model : model;
  const composer = (
    <Composer
      mode={mode}
      tool={tool}
      speed={speed}
      model={status.configured ? status.model : model.replace("-千问", "-Max")}
      draft={draft}
      attachments={attachments}
      busy={chat.busy}
      agentMode={agentMode}
      agentAvailable={status.agentEnabled}
      onAgentMode={setAgentMode}
      recording={voice.recording}
      projectTitle={
        projects.find((project) => project.id === selectedProject)?.title ||
        "选择工作项目"
      }
      width={width}
      inputRef={inputRef}
      onDraft={setDraft}
      onSubmit={submit}
      onTool={selectTool}
      onRemove={(id) =>
        setAttachments((current) => current.filter((file) => file.id !== id))
      }
      onFiles={addFiles}
      onMenu={composerMenu}
      onPanel={showPanel}
      onVoice={() => (voice.recording ? voice.stop() : showDialog("voice"))}
      onCloud={() => notify("云端工作模式。连接真实模型后可处理工作任务。")}
    />
  );
  return (
    <>
      <div
        className={`app${mode === "work" ? " work-mode" : ""}${collapsed ? " sidebar-collapsed" : ""}${mobileOpen ? " mobile-sidebar" : ""}`}
      >
        <div className="sidebar-scrim" onClick={hideMobile} />
        <Sidebar
          mode={mode}
          inert={mobile ? !mobileOpen : collapsed}
          conversations={chat.conversations}
          currentId={chat.current?.id}
          tasks={tasks}
          onHome={goHome}
          onToggle={toggleSidebar}
          onMode={changeMode}
          onPanel={showPanel}
          onDialog={showDialog}
          onOpen={openChat}
          onDelete={(id) => {
            if (chat.current?.id === id) goHome();
            chat.remove(id);
          }}
          onTask={(task) => {
            setTaskDetail(task);
            showDialog("task-detail");
          }}
          onSettings={settings}
        />
        <main className="main" inert={mobile && mobileOpen}>
          <header className="topbar">
            <div className="topbar-left">
              <IconButton
                className="expand-button"
                icon="sidebar"
                label="展开侧边栏"
                onClick={toggleSidebar}
              />
              <button
                className="model-button"
                aria-haspopup="menu"
                aria-expanded={false}
                onClick={(event) => composerMenu("model", event.currentTarget)}
              >
                <span>{modelLabel}</span>
                <span className="small-icon">
                  <Icon name="chevron" />
                </span>
              </button>
            </div>
            <div className="header-actions">
              <a
                className="header-link api-link"
                href="https://bailian.console.aliyun.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="api" />
                API 服务
              </a>
              <button
                className="download-button"
                aria-label="下载电脑端"
                onClick={() => showDialog("download")}
              >
                <Icon name="windows" />
                <span>下载电脑端</span>
              </button>
              <button
                className="login-button"
                onClick={() => showDialog("login")}
              >
                {localLogin ? "本地用户" : "登录"}
              </button>
            </div>
          </header>
          {panel ? (
            <Panels
              name={panel}
              files={files}
              projects={projects}
              onUpload={upload}
              onProjectDialog={() => showDialog("project")}
              onSelectProject={chooseProject}
              onDeleteProject={(id) => {
                setProjects((current) =>
                  current.filter((project) => project.id !== id),
                );
                if (selectedProject === id) setSelectedProject("");
              }}
              onDeleteFile={(id) =>
                setFiles((current) => current.filter((file) => file.id !== id))
              }
              onCard={card}
            />
          ) : chat.current ? (
            <Conversation
              chat={chat.current}
              busy={chat.busy}
              onCopy={(text) => {
                void Promise.resolve()
                  .then(() => navigator.clipboard.writeText(text))
                  .then(() => notify("回答已复制。"))
                  .catch(() => notify("复制失败，请选中文字后复制。"));
              }}
              onRetry={(index) =>
                chat.retry(index, status.configured, tool, speed)
              }
            >
              {composer}
            </Conversation>
          ) : (
            <Home
              mode={mode}
              slide={slide}
              closed={promoClosed}
              onSlide={setSlide}
              onClosePromo={() => setPromoClosed(true)}
              onWork={() => changeMode("work")}
              onDownload={() => showDialog("download")}
              onPrompt={(value) => {
                setDraft(value);
                focusInput();
              }}
            >
              {composer}
            </Home>
          )}
          {!panel && (
            <footer className="legal">
              继续使用即表示您同意{" "}
              <a
                href="https://terms.alicdn.com/legal-agreement/terms/c_end_product_protocol/20231011201348415/20231011201348415.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                用户协议
              </a>{" "}
              和{" "}
              <a
                href="https://terms.alicdn.com/legal-agreement/terms/privacy_policy_full/20231011201849846/20231011201849846.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                隐私政策
              </a>
            </footer>
          )}
        </main>
      </div>
      {menu && <Popover menu={menu} onClose={closeMenu} />}
      {dialog && (
        <Dialog
          key={dialog}
          kind={dialog}
          model={status.configured ? status.model : ""}
          task={taskDetail}
          conversations={chat.conversations}
          currentId={chat.current?.id}
          notify={notify}
          onClose={() => setDialog(null)}
          onLocalLogin={() => {
            setLocalLogin(true);
            setDialog(null);
            notify("已进入本地模式，对话保存在当前浏览器。");
          }}
          onTask={(task) => {
            setTasks((current) => [
              { id: crypto.randomUUID(), ...task },
              ...current,
            ]);
            setDialog(null);
            notify("任务已保存到本地。");
          }}
          onProject={(title) => {
            setProjects((current) => [
              { id: crypto.randomUUID(), title },
              ...current,
            ]);
            setDialog(null);
            showPanel("projects");
          }}
          onOpen={openChat}
          onDeleteChat={chat.remove}
          onDeleteTask={(id) => {
            setTasks((current) => current.filter((task) => task.id !== id));
            setDialog(null);
          }}
          onVoice={() => {
            setDialog(null);
            voice.start();
          }}
        />
      )}
      <input
        type="file"
        ref={fileRef}
        aria-label="选择附件"
        multiple
        accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
        hidden
        onChange={(event) => {
          addFiles(event.target.files || []);
          event.target.value = "";
        }}
      />
      <div className="toast" role="status" hidden={!toast}>
        {toast}
      </div>
    </>
  );
}
