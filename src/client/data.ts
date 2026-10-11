import type { Panel } from "./types.ts";

export const icons: Record<string, string> = {
  sidebar:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18m7-13-4 4 4 4"/>',
  plus: '<path d="M12 3v18M3 12h18"/>',
  "search-chat":
    '<path d="M8 4H5a2 2 0 0 0-2 2v11l4-3h2m5-10h5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6"/><circle cx="11" cy="7" r="4"/><path d="m14 10 3 3"/>',
  files:
    '<rect x="4" y="3" width="12" height="14" rx="1.5"/><path d="M8 17v4h9a2 2 0 0 0 2-2V8h-3"/>',
  create:
    '<path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18 2v8m-4-4h8M8 9v6l5-3z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  download: '<path d="M4 4h16v14H4zM9 21h6m-3-3v3M12 7v7m-3-3 3 3 3-3"/>',
  api: '<path d="m8 3-5 5m13-5 5 5M3 16l5 5m8 0 5-5"/><rect x="8" y="8" width="8" height="8" rx="2" transform="rotate(45 12 12)"/>',
  windows:
    '<path fill="currentColor" stroke="none" d="m2 5 9-1.3V11H2zm10-1.5L22 2v9H12zM2 12h9v7.3L2 18zm10 0h10v10l-10-1.5z"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  spark:
    '<path d="M12 2v7m0 6v7M3 7l6 3m6 4 6 3M3 17l6-3m6-4 6-3"/><path d="m11 10 1-2 1 2 2 2-2 1-1 3-1-3-2-1z" fill="currentColor"/>',
  video:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>',
  presentation:
    '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21l4-4 4 4M7 8h10M7 12h6"/>',
  image:
    '<path d="M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M17 2v6m-3-3h6M3 16l6-6 12 10"/><circle cx="8" cy="7" r="1"/>',
  more: '<path d="M3 5h18M3 12h13M3 19h8"/>',
  mic: '<rect x="8" y="2" width="8" height="14" rx="4"/><path d="M4 11v2a8 8 0 0 0 16 0v-2M12 21v2"/>',
  "arrow-up": '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  "arrow-down": '<path d="M12 4v16m-6-6 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  puzzle:
    '<path d="M8 3h3a3 3 0 1 1 6 0h3v6a3 3 0 1 0 0 6v6h-6a3 3 0 1 0-6 0H3v-6a3 3 0 1 0 0-6V3z"/>',
  connect:
    '<path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5M10 9h4a3 3 0 0 1 0 6h-4a3 3 0 0 1 0-6M12 12h6"/>',
  folder: '<path d="M3 5h7l2 3h9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  monitor:
    '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/>',
  cloud:
    '<path d="M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 14-1 5 5 0 0 1-1 10h-3M8 14l4-4 4 4m-4-4v12"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  translate:
    '<path d="M3 5h12M9 2v3M5 5c1 7 4 10 10 12M13 5C12 11 9 15 3 18m11 3 5-12 5 12m-8-4h6"/>',
  write: '<path d="m15 3 6 6M4 20l1-6L17 2l5 5-12 12zM14 20h8"/>',
  research:
    '<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M7 10h6M10 7v6"/>',
  book: '<path d="M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1zm0 0v15"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  retry: '<path d="M20 10a8 8 0 1 0 0 6m1-14v8h-8"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  file: '<path d="M14 2H5v20h14V7zm0 0v6h5M8 12h8M8 16h6"/>',
};

export const modelNames = ["Qwen3.7-千问", "Qwen3.7-Max", "Qwen3.7-Plus"];
export const toolIcons: Record<string, string> = {
  工作助理: "spark",
  AI生视频: "video",
  PPT创作: "presentation",
  AI生图: "image",
  代码: "code",
  翻译: "translate",
  AI写作: "write",
  录音纪要: "mic",
  研究: "research",
  千问高考: "book",
  音视频速读: "video",
};
export const placeholders: Record<string, string> = {
  AI生图: "描述你想生成的画面",
  AI生视频: "描述你想创作的视频",
  PPT创作: "输入 PPT 主题，让想法变成演示文稿",
  代码: "描述你的编程需求",
  翻译: "输入需要翻译的内容",
  AI写作: "告诉我你想写什么",
  录音纪要: "粘贴录音文字，整理重点与待办",
  研究: "告诉我你想深入研究的问题",
  千问高考: "输入你的学习问题",
  音视频速读: "粘贴音视频文字，快速提炼重点",
};
export const banners = [
  {
    image: "work",
    title: "工作任务就交给千问工作助理",
    description: "专业技能搭配行业数据连接器，助理选的好，当然下班早",
    action: "立即体验",
  },
  {
    image: "input",
    title: "千问输入法 App 全新上线",
    description: "最快 300 字/分，说话即成稿，支持 9 种方言，无广告",
    action: "立即下载体验",
  },
  {
    image: "notes",
    title: "千问一键生成录音纪要",
    description: "断网也能稳定录，纪要自动整理，重要内容一句不漏",
    action: "立即下载体验",
  },
];

export const panels: Record<string, Panel> = {
  space: {
    title: "云空间",
    description: "你的灵感、资料和知识，都在这里。",
    icon: "files",
  },
  create: {
    title: "千问创作",
    description: "从一个想法开始，把灵感变成作品。",
    items: [
      ["AI生图", "描述画面，让灵感成为图像", "image"],
      ["AI生视频", "让故事动起来，创作属于你的精彩", "video"],
      ["PPT创作", "从主题到大纲，让表达更出色", "presentation"],
      ["AI写作", "用文字记录灵感，让创作更轻松", "write"],
      ["代码", "一起把想法变成可以运行的代码", "code"],
      ["翻译", "跨越语言，让表达自由流动", "translate"],
    ],
  },
  skills: {
    title: "技能",
    description: "为工作搭配专业技能，轻松处理不同任务。",
    items: [
      ["写作助手", "梳理思路，完成文案与内容创作", "write"],
      ["编程助手", "代码解释、问题排查和程序设计", "code"],
      ["研究助手", "拆解问题，整理研究方向和资料", "research"],
      ["PPT创作", "生成结构清晰的演示文稿大纲", "presentation"],
      ["翻译助手", "翻译润色，让沟通更加自然", "translate"],
      ["会议纪要", "从文字中提炼重点、决策与待办", "mic"],
    ],
  },
  connect: {
    title: "连接",
    description: "连接常用工具，将信息带入你的工作流程。",
    items: [
      ["本地文件", "选择文档、表格或图片作为任务参考", "files"],
      ["知识资料", "将文字资料粘贴到对话，快速整理要点", "book"],
      ["更多连接", "此演示尚未接入外部应用", "connect"],
    ],
  },
  projects: {
    title: "项目",
    description: "把相关工作放在一起，让每一步都井井有条。",
    icon: "folder",
  },
};
