import type { ChatMessage } from "../chat.ts";
import type { Conversation, StoredMessage } from "./types.ts";
import { isAgentRun, isTerminalRun } from '../shared/agent.ts';
import type { AgentEvent } from '../shared/agent.ts';
function interruptAgent(message: StoredMessage, status: 'stopped' | 'cancelled', reason: 'INTERRUPTED' | 'CANCELLED'): StoredMessage {
    if (!message.agent || message.agent.finishedAt !== undefined)
        return message;
    const description = reason === 'CANCELLED' ? '已停止执行。' : '执行已中断，请重新发起。';
    return { ...message, content: message.content || description, agent: { ...message.agent, status, stopReason: reason, stopMessage: description, finishedAt: Date.now(),
            steps: message.agent.steps.map(step => ['pending', 'running', 'waiting_tool'].includes(step.status) ? { ...step, status: 'cancelled' as const, finishedAt: Date.now() } : step),
            tools: message.agent.tools.map(tool => tool.status === 'running' ? { ...tool, status: 'cancelled' as const } : tool) } };
}
export function readStorage<T>(key: string, fallback: T): T {
    if (typeof localStorage === "undefined")
        return fallback;
    try {
        const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
        return Array.isArray(fallback) && !Array.isArray(value)
            ? fallback
            : ((value ?? fallback) as T);
    }
    catch {
        return fallback;
    }
}
export function readConversations(): Conversation[] {
    return readStorage<Conversation[]>("qwen-conversations", []).filter((chat) => chat && typeof chat.id === "string" && Array.isArray(chat.messages)).map(chat => ({ ...chat, messages: chat.messages.filter(message => message && ['user', 'assistant'].includes(message.role) && typeof message.content === 'string').map(message => {
            if (!message.agent)
                return message;
            if (!isAgentRun(message.agent)) {
                const { agent, ...rest } = message;
                return rest;
            }
            if (isTerminalRun(message.agent.status) && message.agent.finishedAt !== undefined)
                return message;
            return interruptAgent(message, 'stopped', 'INTERRUPTED');
        }) }));
}
export function buildHistory(messages: StoredMessage[]): ChatMessage[] {
    return messages
        .slice(-40)
        .map((message) => ({
        role: message.role,
        content: message.content +
            (message.files?.length
                ? "\n\n附件：\n" +
                    message.files
                        .map((file) => file.text
                        ? `文件 ${file.name}：\n${file.text}`
                        : `文件 ${file.name}（当前仅有文件名，未解析文件内容）`)
                        .join("\n")
                : ""),
    }));
}
export interface ChatState {
    conversations: Conversation[];
    currentId: string | null;
    generation: {
        id: string;
        chatId: string;
        index: number;
        runId?: string;
        seq?: number;
    } | null;
}
export type ChatAction = {
    type: "select";
    id: string | null;
} | {
    type: "delete";
    id: string;
} | {
    type: "start";
    id: string;
    chat: Conversation;
} | {
    type: "text";
    id: string;
    content: string;
    append?: boolean;
} | {
    type: 'agent';
    id: string;
    event: AgentEvent;
} | {
    type: "finish";
    id: string;
} | {
    type: "cancel";
};
function cancel(state: ChatState): ChatState {
    const run = state.generation;
    if (!run)
        return state;
    return {
        ...state,
        generation: null,
        conversations: state.conversations.map((chat) => chat.id !== run.chatId
            ? chat
            : {
                ...chat,
                messages: chat.messages.map((message, index) => index === run.index
                    ? interruptAgent({ ...message, content: message.content || '已停止生成。' }, 'cancelled', 'CANCELLED')
                    : message),
            }),
    };
}
export function chatReducer(state: ChatState, action: ChatAction): ChatState {
    if (action.type === "cancel")
        return cancel(state);
    if (action.type === "select")
        return { ...cancel(state), currentId: action.id };
    if (action.type === "delete")
        return {
            ...(state.generation?.chatId === action.id ? cancel(state) : state),
            currentId: state.currentId === action.id ? null : state.currentId,
            conversations: state.conversations.filter((chat) => chat.id !== action.id),
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
    if (!run || run.id !== action.id)
        return state;
    if (action.type === 'agent') {
        const event = action.event;
        const previous = state.conversations.find(chat => chat.id === run.chatId)?.messages[run.index]?.agent;
        if ((run.runId && run.runId !== event.runId) || event.seq <= (run.seq || 0) || (previous?.finishedAt !== undefined && isTerminalRun(previous.status)))
            return state;
        return { ...state, generation: { ...run, runId: event.runId, seq: event.seq }, conversations: state.conversations.map(chat => chat.id !== run.chatId ? chat : { ...chat, messages: chat.messages.map((message, index) => index !== run.index ? message : { ...message, agent: event.run, ...(event.answer ? { content: event.answer } : {}) }) }) };
    }
    if (action.type === "finish")
        return { ...state, generation: null, conversations: state.conversations.map(chat => chat.id !== run.chatId ? chat : { ...chat, messages: chat.messages.map((message, index) => index !== run.index ? message : interruptAgent(message, 'stopped', 'INTERRUPTED')) }) };
    return {
        ...state,
        conversations: state.conversations.map((chat) => chat.id !== run.chatId
            ? chat
            : {
                ...chat,
                messages: chat.messages.map((message, index) => index === run.index
                    ? { ...message, content: action.append && message.content ? `${message.content}\n\n${action.content}` : action.content }
                    : message),
            }),
    };
}
