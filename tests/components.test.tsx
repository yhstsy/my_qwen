import test from "node:test";
import assert from "node:assert/strict";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Composer } from "../src/client/components/Composer.tsx";
import { Conversation } from "../src/client/components/Conversation.tsx";
import { Home } from "../src/client/components/Home.tsx";

const noop = () => {};
test("React escapes user messages, filenames and drafts while retaining safe assistant Markdown", () => {
  const html = renderToStaticMarkup(
    <Conversation
      busy={false}
      onCopy={noop}
      onRetry={noop}
      chat={{
        id: "old",
        title: "旧记录",
        mode: "daily",
        createdAt: 0,
        messages: [
          {
            role: "user",
            content: "<script>alert(1)</script>",
            files: [{ name: "<img onerror=evil>", text: "内容" }],
          },
          { role: "assistant", content: "**回答**\n<script>bad()</script>" },
        ],
      }}
    >
      <div>输入框</div>
    </Conversation>,
  );
  assert.doesNotMatch(html, /<script>|<img onerror/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<strong>回答<\/strong>/);
  assert.match(html, /输入框/);
});

test("composer retains controlled input, accessible controls and work-mode tools", () => {
  const props = {
    mode: "work" as const,
    tool: "",
    speed: "快速",
    model: "模型",
    draft: "<script>草稿</script>",
    attachments: [],
    busy: false,
    recording: false,
    projectTitle: "项目",
    width: 1280,
    inputRef: createRef<HTMLTextAreaElement>(),
    onDraft: noop,
    onSubmit: noop,
    onTool: noop,
    onRemove: noop,
    onFiles: noop,
    onMenu: noop,
    onPanel: noop,
    onVoice: noop,
    onCloud: noop,
  };
  const html = renderToStaticMarkup(<Composer {...props} />);
  assert.match(html, /&lt;script&gt;草稿&lt;\/script&gt;/);
  assert.match(html, /aria-label="发送消息"/);
  assert.match(html, /work-tools/);
  assert.match(html, /project-select/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(
    renderToStaticMarkup(<Composer {...props} busy />),
    /aria-label="停止生成"/,
  );
});

test("home keeps the existing daily and work layout and supplied carousel state", () => {
  const props = {
    slide: 2,
    closed: false,
    onSlide: noop,
    onClosePromo: noop,
    onWork: noop,
    onDownload: noop,
    onPrompt: noop,
    children: <div className="composer-wrap" />,
  };
  const daily = renderToStaticMarkup(<Home {...props} mode="daily" />);
  assert.match(daily, /你好，我是千问/);
  assert.match(daily, /promo-card/);
  const work = renderToStaticMarkup(<Home {...props} mode="work" />);
  assert.match(work, /work-suggestions/);
  assert.doesNotMatch(work, /promo-card/);
  assert.doesNotMatch(
    renderToStaticMarkup(<Home {...props} mode="daily" closed />),
    /promo-card/,
  );
});
