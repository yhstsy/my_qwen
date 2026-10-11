import test from "node:test";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { buildHistory, chatReducer } from "../src/client/state.ts";
import type { ChatState } from "../src/client/state.ts";
import type { Conversation } from "../src/client/types.ts";
import { requestReply, typeReply } from "../src/client/generation.ts";

const conversation: Conversation = {
  id: "legacy-chat",
  title: "旧会话",
  mode: "daily",
  createdAt: 123,
  messages: [
    {
      role: "user",
      content: "问题",
      files: [{ name: "旧附件.txt", text: "原内容" }],
      tool: "研究",
    },
  ],
};
const initial: ChatState = {
  conversations: [conversation],
  currentId: conversation.id,
  generation: null,
};

test("legacy conversations and attachment context survive immutable updates", () => {
  const started = chatReducer(initial, {
    type: "start",
    id: "run-1",
    chat: conversation,
  });
  const updated = chatReducer(started, {
    type: "text",
    id: "run-1",
    content: "回答",
  });
  assert.equal(initial.conversations[0].messages.length, 1);
  assert.equal(updated.conversations[0].messages[1].content, "回答");
  assert.deepEqual(
    updated.conversations[0].messages[0],
    conversation.messages[0],
  );
  assert.deepEqual(buildHistory(conversation.messages), [
    { role: "user", content: "问题\n\n附件：\n文件 旧附件.txt：\n原内容" },
  ]);
  assert.equal(
    buildHistory(
      Array.from({ length: 42 }, (_, index) => ({
        role: "user",
        content: String(index),
      })),
    ).length,
    40,
  );
});

test("switching conversations rejects stale replies and cannot finish a newer request", () => {
  const started = chatReducer(initial, {
    type: "start",
    id: "old",
    chat: conversation,
  });
  const selected = chatReducer(started, { type: "select", id: null });
  assert.equal(selected.generation, null);
  assert.equal(selected.conversations[0].messages[1].content, "已停止生成。");
  assert.equal(
    chatReducer(selected, { type: "text", id: "old", content: "过期回答" }),
    selected,
  );
  const next = chatReducer(selected, {
    type: "start",
    id: "new",
    chat: { ...conversation, id: "new-chat" },
  });
  assert.equal(chatReducer(next, { type: "finish", id: "old" }), next);
  assert.equal(next.generation?.id, "new");
  const removed = chatReducer(next, { type: "delete", id: "new-chat" });
  assert.equal(removed.currentId, null);
  assert.equal(removed.generation, null);
  assert.equal(removed.conversations.length, 1);
});

test("stopping preserves partial output and leaves existing history intact", () => {
  let state = chatReducer(initial, {
    type: "start",
    id: "run",
    chat: conversation,
  });
  state = chatReducer(state, {
    type: "text",
    id: "run",
    content: "已生成部分",
  });
  const cancelled = chatReducer(state, { type: "cancel" });
  assert.equal(cancelled.conversations[0].messages[1].content, "已生成部分");
  assert.equal(
    cancelled.conversations[0].messages[0].files?.[0].text,
    "原内容",
  );
  assert.equal(
    chatReducer(cancelled, { type: "text", id: "run", content: "覆盖" }),
    cancelled,
  );
});

test("React client sends the existing API contract and handles invalid responses", async () => {
  const signal = new AbortController().signal;
  const options = {
    history: buildHistory(conversation.messages),
    apiAvailable: true,
    tool: "研究",
    speed: "思考",
    signal,
  };
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, "/api/chat");
    assert.equal(init?.signal, signal);
    assert.deepEqual(JSON.parse(init?.body as string), {
      messages: options.history,
      mode: "思考",
      tool: "研究",
    });
    return Response.json({ content: "模拟回答" });
  };
  assert.equal(await requestReply({ ...options, fetcher }), "模拟回答");
  await assert.rejects(
    requestReply({
      ...options,
      fetcher: async () =>
        Response.json({ error: "额度不足" }, { status: 429 }),
    }),
    /额度不足/,
  );
  await assert.rejects(
    requestReply({
      ...options,
      fetcher: async () => Response.json({ content: null }),
    }),
    /有效内容/,
  );
  const neverFetch: typeof fetch = async () => {
    throw new Error("不应发起请求");
  };
  assert.match(
    await requestReply({
      ...options,
      apiAvailable: false,
      fetcher: neverFetch,
    }),
    /本地演示回复/,
  );
  assert.match(
    await requestReply({ ...options, tool: "AI生图", fetcher: neverFetch }),
    /暂不支持/,
  );
});

test("aborting typing cancels its timer and cannot write after cancellation", async () => {
  const controller = new AbortController();
  const values: string[] = [];
  const pending = typeReply(
    "123456789",
    controller.signal,
    (value) => {
      values.push(value);
      controller.abort();
    },
    1,
    1,
  );
  await assert.rejects(pending, { name: "AbortError" });
  await delay(15);
  assert.deepEqual(values, ["1"]);
  await assert.rejects(
    typeReply("ignored", controller.signal, () =>
      assert.fail("cancelled callback"),
    ),
    { name: "AbortError" },
  );
  const complete: string[] = [];
  await typeReply(
    "完整文本",
    new AbortController().signal,
    (value) => complete.push(value),
    2,
    1,
  );
  assert.equal(complete.at(-1), "完整文本");
});
