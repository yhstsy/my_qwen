import type { ChatMessage } from "../chat.ts";

interface ReplyOptions {
  history: ChatMessage[];
  apiAvailable: boolean;
  tool: string;
  speed: string;
  signal: AbortSignal;
  fetcher?: typeof fetch;
}
export async function requestReply({
  history,
  apiAvailable,
  tool,
  speed,
  signal,
  fetcher = fetch,
}: ReplyOptions): Promise<string> {
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
  const result: { content?: unknown; error?: string } = await response.json();
  if (!response.ok)
    throw new Error(result.error || "模型服务暂时不可用，请稍后重试。");
  if (typeof result.content !== "string")
    throw new Error("模型未返回有效内容，请重试。");
  return result.content;
}

export function typeReply(
  answer: string,
  signal: AbortSignal,
  onText: (text: string) => void,
  step = 12,
  intervalMs = 22,
): Promise<void> {
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
