import type { ChatMessage } from "../chat.ts";
import type { Conversation, StoredMessage } from "./types.ts";

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return Array.isArray(fallback) && !Array.isArray(value)
      ? fallback
      : ((value ?? fallback) as T);
  } catch {
    return fallback;
  }
}

export function readConversations(): Conversation[] {
  return readStorage<Conversation[]>("qwen-conversations", []).filter(
    (chat) =>
      chat && typeof chat.id === "string" && Array.isArray(chat.messages),
  );
}

export function buildHistory(messages: StoredMessage[]): ChatMessage[] {
  return messages
    .slice(-40)
    .map((message) => ({
      role: message.role,
      content:
        message.content +
        (message.files?.length
          ? "\n\n附件：\n" +
            message.files
              .map((file) =>
                file.text
                  ? `文件 ${file.name}：\n${file.text}`
                  : `文件 ${file.name}（当前仅有文件名，未解析文件内容）`,
              )
              .join("\n")
          : ""),
    }));
}

export interface ChatState {
  conversations: Conversation[];
  currentId: string | null;
  generation: { id: string; chatId: string; index: number } | null;
}
export type ChatAction =
  | { type: "select"; id: string | null }
  | { type: "delete"; id: string }
  | { type: "start"; id: string; chat: Conversation }
  | { type: "text"; id: string; content: string }
  | { type: "finish"; id: string }
  | { type: "cancel" };

function cancel(state: ChatState): ChatState {
  const run = state.generation;
  if (!run) return state;
  return {
    ...state,
    generation: null,
    conversations: state.conversations.map((chat) =>
      chat.id !== run.chatId
        ? chat
        : {
            ...chat,
            messages: chat.messages.map((message, index) =>
              index === run.index && !message.content
                ? { ...message, content: "已停止生成。" }
                : message,
            ),
          },
    ),
  };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  if (action.type === "cancel") return cancel(state);
  if (action.type === "select")
    return { ...cancel(state), currentId: action.id };
  if (action.type === "delete")
    return {
      ...(state.generation?.chatId === action.id ? cancel(state) : state),
      currentId: state.currentId === action.id ? null : state.currentId,
      conversations: state.conversations.filter(
        (chat) => chat.id !== action.id,
      ),
    };
  if (action.type === "start") {
    const chat = {
      ...action.chat,
      messages: [
        ...action.chat.messages,
        { role: "assistant" as const, content: "" },
      ],
    };
    const exists = state.conversations.some((item) => item.id === chat.id);
    return {
      currentId: chat.id,
      generation: {
        id: action.id,
        chatId: chat.id,
        index: chat.messages.length - 1,
      },
      conversations: exists
        ? state.conversations.map((item) => (item.id === chat.id ? chat : item))
        : [chat, ...state.conversations],
    };
  }
  const run = state.generation;
  if (!run || run.id !== action.id) return state;
  if (action.type === "finish") return { ...state, generation: null };
  return {
    ...state,
    conversations: state.conversations.map((chat) =>
      chat.id !== run.chatId
        ? chat
        : {
            ...chat,
            messages: chat.messages.map((message, index) =>
              index === run.index
                ? { ...message, content: action.content }
                : message,
            ),
          },
    ),
  };
}
