import type { ChatMessage } from "../chat.ts";
import { isAgentEvent, isTerminalRun } from '../shared/agent.ts';
import type { AgentEvent } from '../shared/agent.ts';
interface ReplyOptions {
    history: ChatMessage[];
    apiAvailable: boolean;
    tool: string;
    speed: string;
    signal: AbortSignal;
    fetcher?: typeof fetch;
}
export async function requestReply({ history, apiAvailable, tool, speed, signal, fetcher = fetch, }: ReplyOptions): Promise<string> {
    if (!apiAvailable)
        return "这是本地演示回复。当前页面尚未连接 AI 模型，暂时无法回答问题或生成内容。\n\n你可以体验消息发送、新建对话、历史记录、附件选择和工作模式；对话会保存在当前浏览器中。\n\n连接模型服务后，即可在这个界面中进行真实的 AI 对话。";
    if (["AI生图", "AI生视频"].includes(tool))
        return "当前接入的是文字对话模型，暂不支持直接生成图片或视频。可以切换到文字模式，先完善创作提示词。";
    const response = await fetcher("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, mode: speed, tool }),
        signal,
    });
    const result: {
        content?: unknown;
        error?: string;
    } = await response.json();
    if (!response.ok)
        throw new Error(result.error || "模型服务暂时不可用，请稍后重试。");
    if (typeof result.content !== "string")
        throw new Error("模型未返回有效内容，请重试。");
    return result.content;
}
export async function requestAgent({ history, signal, fetcher = fetch, onEvent }: ReplyOptions & {
    onEvent: (event: AgentEvent) => void;
}): Promise<void> {
    const response = await fetcher('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' }, body: JSON.stringify({ messages: history, executionMode: 'agent' }), signal });
    if (!response.ok) {
        const body = await response.json().catch(() => null) as {
            error?: unknown;
        } | null;
        throw new Error(typeof body?.error === 'string' ? body.error : '多步骤执行暂时不可用。');
    }
    if (!response.headers.get('content-type')?.includes('application/x-ndjson') || !response.body)
        throw new Error('执行事件流格式不正确。');
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let buffer = '', runId = '', seq = 0, finished = false, answered = false, total = 0;
    const consume = (line: string) => {
        if (!line.trim())
            return;
        if (line.length > 131072 || finished)
            throw new Error('执行事件流不正确。');
        let event: unknown;
        try {
            event = JSON.parse(line);
        }
        catch {
            throw new Error('执行事件不是有效 JSON。');
        }
        if (!isAgentEvent(event) || event.seq !== seq + 1 || (runId && event.runId !== runId) || (!seq && event.type !== 'run.started'))
            throw new Error('执行事件编号或内容不正确。');
        runId = event.runId;
        seq = event.seq;
        if (event.type === 'answer.completed') {
            if (!event.answer)
                throw new Error('任务没有返回答案。');
            answered = true;
        }
        if (event.type === 'run.finished') {
            if (!answered || !isTerminalRun(event.run.status) || typeof event.run.finishedAt !== 'number')
                throw new Error('任务终态无效。');
            finished = true;
        }
        if (!signal.aborted)
            onEvent(event);
    };
    try {
        while (true) {
            if (signal.aborted)
                throw new DOMException('Cancelled', 'AbortError');
            const chunk = await reader.read();
            buffer += decoder.decode(chunk.value, { stream: !chunk.done });
            total += chunk.value?.byteLength || 0;
            if (total > 4 * 1024 * 1024)
                throw new Error('执行事件总量超过限制。');
            let newline: number;
            while ((newline = buffer.indexOf('\n')) >= 0) {
                consume(buffer.slice(0, newline));
                buffer = buffer.slice(newline + 1);
            }
            if (buffer.length > 131072)
                throw new Error('执行事件过长。');
            if (chunk.done)
                break;
        }
        if (buffer.trim())
            consume(buffer);
        if (!finished)
            throw new Error('执行连接已中断，任务尚未完成。');
    }
    finally {
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
}
export function typeReply(answer: string, signal: AbortSignal, onText: (text: string) => void, step = 12, intervalMs = 22): Promise<void> {
    return new Promise((resolve, reject) => {
        let offset = 0;
        let timer: ReturnType<typeof setInterval> | undefined;
        const cleanup = () => {
            clearInterval(timer);
            signal.removeEventListener("abort", abort);
        };
        const abort = () => {
            cleanup();
            reject(new DOMException("Cancelled", "AbortError"));
        };
        if (signal.aborted) {
            abort();
            return;
        }
        signal.addEventListener("abort", abort, { once: true });
        timer = setInterval(() => {
            offset = Math.min(answer.length, offset + step);
            onText(answer.slice(0, offset));
            if (offset === answer.length) {
                cleanup();
                resolve();
            }
        }, intervalMs);
    });
}
