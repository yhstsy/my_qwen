import { useEffect, useReducer, useRef } from "react";
import { buildHistory, chatReducer, readConversations } from "../state.ts";
import { requestReply, typeReply } from "../generation.ts";
import type { Conversation, Mode, StoredMessage } from "../types.ts";

export function useChat(notify: (message: string) => void) {
  const [state, dispatch] = useReducer(chatReducer, undefined, () => ({
    conversations: readConversations(),
    currentId: null,
    generation: null,
  }));
  const active = useRef<AbortController | null>(null);
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    try {
      localStorage.setItem(
        "qwen-conversations",
        JSON.stringify(state.conversations),
      );
    } catch {
      notify("浏览器存储空间不足，本次内容暂未保存。");
    }
  }, [state.conversations, notify]);
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(
          "qwen-conversations",
          JSON.stringify(latest.current.conversations),
        );
      } catch {}
    };
    window.addEventListener("beforeunload", save);
    return () => {
      active.current?.abort();
      window.removeEventListener("beforeunload", save);
    };
  }, []);
  const stop = () => {
    active.current?.abort();
    active.current = null;
    dispatch({ type: "cancel" });
  };
  const select = (id: string | null) => {
    stop();
    dispatch({ type: "select", id });
  };
  const remove = (id: string) => {
    if (latest.current.generation?.chatId === id) stop();
    dispatch({ type: "delete", id });
  };
  async function generate(
    chat: Conversation,
    apiAvailable: boolean,
    tool: string,
    speed: string,
  ) {
    stop();
    const controller = new AbortController();
    active.current = controller;
    const id = crypto.randomUUID();
    dispatch({ type: "start", id, chat });
    try {
      const answer = await requestReply({
        history: buildHistory(chat.messages),
        apiAvailable,
        tool,
        speed,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      await typeReply(
        answer,
        controller.signal,
        (content) => dispatch({ type: "text", id, content }),
        apiAvailable ? 12 : 5,
      );
    } catch (error) {
      if (!controller.signal.aborted)
        dispatch({
          type: "text",
          id,
          content: `暂时无法完成回复：${error instanceof Error ? error.message : String(error)}`,
        });
    } finally {
      dispatch({ type: "finish", id });
      if (active.current === controller) active.current = null;
    }
  }
  const current = state.conversations.find(
    (chat) => chat.id === state.currentId,
  );
  function send(
    message: StoredMessage,
    mode: Mode,
    apiAvailable: boolean,
    tool: string,
    speed: string,
  ) {
    if (state.generation) return;
    const chat: Conversation = current
      ? { ...current, messages: [...current.messages, message] }
      : {
          id: crypto.randomUUID(),
          title: (message.content === "请查看附件" && message.files?.length
            ? message.files[0].name
            : message.content
          ).slice(0, 26),
          mode,
          createdAt: Date.now(),
          messages: [message],
        };
    void generate(chat, apiAvailable, tool, speed);
  }
  function retry(
    index: number,
    apiAvailable: boolean,
    tool: string,
    speed: string,
  ) {
    if (!current || state.generation) return;
    void generate(
      { ...current, messages: current.messages.slice(0, index) },
      apiAvailable,
      tool,
      speed,
    );
  }
  return {
    conversations: state.conversations,
    current,
    busy: !!state.generation,
    send,
    retry,
    stop,
    select,
    remove,
  };
}
