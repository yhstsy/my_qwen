import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { formatSize } from "../../chat.ts";
import { placeholders, toolIcons } from "../data.ts";
import type { Attachment, Mode } from "../types.ts";
import { Icon, IconButton } from "./Icon.tsx";

export type ComposerMenu = "model" | "speed" | "more" | "attach" | "project";
interface Props {
  mode: Mode;
  tool: string;
  speed: string;
  model: string;
  draft: string;
  attachments: Attachment[];
  busy: boolean;
  recording: boolean;
  projectTitle: string;
  width: number;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onDraft: (value: string) => void;
  onSubmit: () => void;
  onTool: (tool: string) => void;
  onRemove: (id: string) => void;
  onFiles: (files: Iterable<File>) => void;
  onMenu: (
    kind: ComposerMenu,
    anchor: HTMLElement,
    visibleTools?: string[],
  ) => void;
  onPanel: (panel: "connect" | "skills") => void;
  onVoice: () => void;
  onCloud: () => void;
}
export function Composer(p: Props) {
  const form = useRef<HTMLFormElement>(null);
  const composing = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [visibleTools, setVisibleTools] = useState<string[]>([]);
  useLayoutEffect(() => {
    const textarea = p.inputRef.current;
    if (textarea) {
      textarea.style.height = "50px";
      textarea.style.height = `${Math.min(182, Math.max(p.mode === "work" ? 54 : 50, textarea.scrollHeight))}px`;
    }
  }, [p.draft, p.mode, p.inputRef]);
  useLayoutEffect(() => {
    setVisibleTools(
      [...form.current!.querySelectorAll<HTMLButtonElement>("[data-tool]")]
        .filter((button) => button.getClientRects().length)
        .map((button) => button.dataset.tool!),
    );
  }, [p.width, p.mode]);
  const moreSelected = !!p.tool && !visibleTools.includes(p.tool);
  const tool = (name: string, className: string) => (
    <button
      type="button"
      className={`tool-button ${className}`}
      data-tool={name}
      aria-pressed={p.tool === name}
      onClick={() => p.onTool(name)}
    >
      <Icon name={toolIcons[name]} />
      {name}
      {name === "工作助理" && <span className="cloud-tag">云端</span>}
    </button>
  );
  const menu = (
    kind: ComposerMenu,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => p.onMenu(kind, event.currentTarget, visibleTools);
  return (
    <div className="composer-wrap">
      <form
        className={`composer${dragging ? " drag-over" : ""}`}
        ref={form}
        onSubmit={(event) => {
          event.preventDefault();
          p.onSubmit();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          p.onFiles(event.dataTransfer.files);
        }}
      >
        <div
          className="attachments"
          aria-label="已选择的附件"
          hidden={!p.attachments.length}
        >
          {p.attachments.map((file) => (
            <div className="attachment" key={file.id}>
              <Icon name="file" />
              <div>
                <div className="attachment-name" title={file.name}>
                  {file.name}
                </div>
                <div className="attachment-size">{formatSize(file.size)}</div>
              </div>
              <IconButton
                icon="close"
                label={`移除 ${file.name}`}
                onClick={() => p.onRemove(file.id)}
              />
            </div>
          ))}
        </div>
        <label htmlFor="prompt" className="sr-only">
          向千问提问
        </label>
        <textarea
          id="prompt"
          ref={p.inputRef}
          rows={1}
          placeholder={
            placeholders[p.tool] ||
            (p.mode === "work" ? "今天一起做点什么？" : "向千问提问")
          }
          maxLength={30000}
          enterKeyHint="send"
          value={p.draft}
          onChange={(event) => p.onDraft(event.target.value)}
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              !composing.current
            ) {
              event.preventDefault();
              if (p.busy || p.draft.trim() || p.attachments.length)
                form.current?.requestSubmit();
            }
          }}
        />
        <div className="composer-toolbar">
          <IconButton
            className="attach-button"
            icon="plus"
            label="添加附件"
            aria-haspopup="menu"
            aria-expanded={false}
            onClick={(event) => menu("attach", event)}
          />
          {p.mode === "daily" ? (
            <div className="tools daily-tools">
              <button
                type="button"
                className="tool-button"
                aria-haspopup="menu"
                aria-expanded={false}
                onClick={(event) => menu("speed", event)}
              >
                <Icon name="bolt" />
                <span>{p.speed}</span>
                <span className="tiny-icon">
                  <Icon name="chevron" />
                </span>
              </button>
              {tool("工作助理", "assistant-tool")}
              {tool("AI生视频", "video-tool")}
              {tool("PPT创作", "ppt-tool")}
              {tool("AI生图", "image-tool")}
              <button
                type="button"
                className="tool-button"
                aria-haspopup="menu"
                aria-expanded={false}
                aria-pressed={moreSelected}
                onClick={(event) => menu("more", event)}
              >
                <Icon name={moreSelected ? toolIcons[p.tool] : "more"} />
                {moreSelected ? p.tool : "更多"}
              </button>
            </div>
          ) : (
            <div className="tools work-tools">
              <button type="button" className="tool-button" onClick={p.onCloud}>
                <Icon name="cloud" />
                云端
                <span className="tiny-icon">
                  <Icon name="chevron" />
                </span>
              </button>
              <button
                type="button"
                className="tool-button"
                data-panel="connect"
                onClick={() => p.onPanel("connect")}
              >
                <Icon name="connect" />
                连接
                <span className="tiny-icon">
                  <Icon name="chevron" />
                </span>
              </button>
              <button
                type="button"
                className="tool-button"
                data-panel="skills"
                onClick={() => p.onPanel("skills")}
              >
                <Icon name="puzzle" />
                技能
                <span className="tiny-icon">
                  <Icon name="chevron" />
                </span>
              </button>
              <button
                type="button"
                className="tool-button work-model"
                aria-haspopup="menu"
                aria-expanded={false}
                onClick={(event) => menu("model", event)}
              >
                {p.model}
                <span className="tiny-icon">
                  <Icon name="chevron" />
                </span>
              </button>
            </div>
          )}
          <div className="send-actions">
            <IconButton
              className={`voice-button${p.recording ? " recording" : ""}`}
              icon="mic"
              label={p.recording ? "停止语音输入" : "语音输入"}
              onClick={p.onVoice}
            />
            <button
              type="submit"
              className="send-button"
              aria-label={p.busy ? "停止生成" : "发送消息"}
              disabled={!p.busy && !p.draft.trim() && !p.attachments.length}
            >
              <Icon name={p.busy ? "stop" : "arrow-up"} />
            </button>
          </div>
        </div>
      </form>
      {p.mode === "work" && (
        <button
          className="project-select"
          aria-haspopup="menu"
          aria-expanded={false}
          onClick={(event) => menu("project", event)}
        >
          <Icon name="folder" />
          <span>{p.projectTitle}</span>
          <span className="tiny-icon">
            <Icon name="chevron" />
          </span>
        </button>
      )}
    </div>
  );
}
