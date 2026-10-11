import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { renderMessage } from "../../chat.ts";
import type { Conversation as ConversationData } from "../types.ts";
import { Icon, IconButton } from "./Icon.tsx";
import { AgentProgress } from './AgentProgress.tsx';

export function Conversation({
  chat,
  busy,
  children,
  onCopy,
  onRetry,
}: {
  chat: ConversationData;
  busy: boolean;
  children: ReactNode;
  onCopy: (text: string) => void;
  onRetry: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef({ id: "", length: 0 });
  const [showBottom, setShowBottom] = useState(false);
  const scroll = () => {
    const node = ref.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
      setShowBottom(false);
    }
  };
  useLayoutEffect(() => {
    const node = ref.current;
    if (
      node &&
      (previous.current.id !== chat.id ||
        previous.current.length !== chat.messages.length ||
        node.scrollHeight - node.scrollTop - node.clientHeight < 200)
    )
      scroll();
    previous.current = { id: chat.id, length: chat.messages.length };
  }, [chat]);
  return (
    <section className="conversation" aria-label="当前对话">
      <div
        className="messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        ref={ref}
        onScroll={() => {
          const node = ref.current!;
          setShowBottom(
            node.scrollHeight - node.scrollTop - node.clientHeight >= 160,
          );
        }}
      >
        {chat.messages.map((message, index) =>
          message.role === "user" ? (
            <div className="message user-message" key={index}>
              <div className="user-bubble">
                {message.content}
                {!!message.files?.length && (
                  <div className="message-files">
                    {message.files.map((file, i) => (
                      <span key={i}>
                        <Icon name="file" /> {file.name}
                        {i < message.files!.length - 1 ? " · " : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="message assistant-message" key={index}>
              <img
                className="assistant-avatar"
                src="/assets/qwen.svg"
                alt="千问"
              />
              <div className="assistant-content">
                {message.agent && <AgentProgress run={message.agent} />}
                <div
                  className="message-text"
                  dangerouslySetInnerHTML={{
                    __html: renderMessage(message.content),
                  }}
                />
                {message.content ? (
                  <div className="message-actions">
                    <IconButton
                      icon="copy"
                      label="复制回答"
                      onClick={() => onCopy(message.content)}
                    />
                    <IconButton
                      icon="retry"
                      label="重新生成"
                      disabled={busy}
                      onClick={() => onRetry(index)}
                    />
                  </div>
                ) : (
                  <div className="thinking" aria-label="正在生成">
                    <i />
                    <i />
                    <i />
                  </div>
                )}
              </div>
            </div>
          ),
        )}
      </div>
      <IconButton
        className="scroll-bottom"
        icon="arrow-down"
        label="滚动到底部"
        hidden={!showBottom}
        onClick={scroll}
      />
      <div className="conversation-composer">{children}</div>
    </section>
  );
}
