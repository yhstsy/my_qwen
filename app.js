import { escapeHtml as escape, renderMessage, formatSize } from './chat.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const icons = {
  sidebar:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18m7-13-4 4 4 4"/>',
  plus:'<path d="M12 3v18M3 12h18"/>',
  'search-chat':'<path d="M8 4H5a2 2 0 0 0-2 2v11l4-3h2m5-10h5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6"/><circle cx="11" cy="7" r="4"/><path d="m14 10 3 3"/>',
  files:'<rect x="4" y="3" width="12" height="14" rx="1.5"/><path d="M8 17v4h9a2 2 0 0 0 2-2V8h-3"/>',
  create:'<path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18 2v8m-4-4h8M8 9v6l5-3z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  download:'<path d="M4 4h16v14H4zM9 21h6m-3-3v3M12 7v7m-3-3 3 3 3-3"/>',
  api:'<path d="m8 3-5 5m13-5 5 5M3 16l5 5m8 0 5-5"/><rect x="8" y="8" width="8" height="8" rx="2" transform="rotate(45 12 12)"/>',
  windows:'<path fill="currentColor" stroke="none" d="m2 5 9-1.3V11H2zm10-1.5L22 2v9H12zM2 12h9v7.3L2 18zm10 0h10v10l-10-1.5z"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  spark:'<path d="M12 2v7m0 6v7M3 7l6 3m6 4 6 3M3 17l6-3m6-4 6-3"/><path d="m11 10 1-2 1 2 2 2-2 1-1 3-1-3-2-1z" fill="currentColor"/>',
  video:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 9 5 3-5 3z" fill="currentColor"/>',
  presentation:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21l4-4 4 4M7 8h10M7 12h6"/>',
  image:'<path d="M13 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M17 2v6m-3-3h6M3 16l6-6 12 10"/><circle cx="8" cy="7" r="1"/>',
  more:'<path d="M3 5h18M3 12h13M3 19h8"/>',
  mic:'<rect x="8" y="2" width="8" height="14" rx="4"/><path d="M4 11v2a8 8 0 0 0 16 0v-2M12 21v2"/>',
  'arrow-up':'<path d="M12 20V4m-6 6 6-6 6 6"/>',
  'arrow-down':'<path d="M12 4v16m-6-6 6 6 6-6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  puzzle:'<path d="M8 3h3a3 3 0 1 1 6 0h3v6a3 3 0 1 0 0 6v6h-6a3 3 0 1 0-6 0H3v-6a3 3 0 1 0 0-6V3z"/>',
  connect:'<path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5M10 9h4a3 3 0 0 1 0 6h-4a3 3 0 0 1 0-6M12 12h6"/>',
  folder:'<path d="M3 5h7l2 3h9v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4m-5 0h10"/>',
  cloud:'<path d="M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 14-1 5 5 0 0 1-1 10h-3M8 14l4-4 4 4m-4-4v12"/>',
  code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  translate:'<path d="M3 5h12M9 2v3M5 5c1 7 4 10 10 12M13 5C12 11 9 15 3 18m11 3 5-12 5 12m-8-4h6"/>',
  write:'<path d="m15 3 6 6M4 20l1-6L17 2l5 5-12 12zM14 20h8"/>',
  research:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M7 10h6M10 7v6"/>',
  book:'<path d="M12 5C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1zm0 0v15"/>',
  copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  retry:'<path d="M20 10a8 8 0 1 0 0 6m1-14v8h-8"/>',
  check:'<path d="m4 12 5 5L20 6"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  moon:'<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  file:'<path d="M14 2H5v20h14V7zm0 0v6h5M8 12h8M8 16h6"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`; }
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon)); }
hydrateIcons();

function readStorage(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(fallback) && !Array.isArray(value) ? fallback : value ?? fallback; } catch { return fallback; }
}
let conversations = readStorage('qwen-conversations', []).filter(item => item && typeof item.id === 'string' && Array.isArray(item.messages));
let tasks = readStorage('qwen-tasks', []);
let projects = readStorage('qwen-projects', []);
let files = readStorage('qwen-files', []);
let currentId = null;
let mode = 'daily';
let activeTool = '';
let speed = '快速';
let selectedProject = '';
let attachments = [];
let busy = false;
let abortController;
let typingTimer;
let activePopover;
let toastTimer;
let apiAvailable = false;
let apiModel = '';
let recognition;
let isComposing = false;
let slide = 2;
const app = $('#app');
const prompt = $('#prompt');
const popover = $('#popover');
const dialog = $('#dialog');
const home = $('#home');
const composerWrap = $('#composer-wrap');
const messagesElement = $('#messages');
const modelNames = ['Qwen3.7-千问', 'Qwen3.7-Max', 'Qwen3.7-Plus'];
const toolIcons = {'工作助理':'spark','AI生视频':'video','PPT创作':'presentation','AI生图':'image','代码':'code','翻译':'translate','AI写作':'write','录音纪要':'mic','研究':'research','千问高考':'book','音视频速读':'video'};
const placeholders = {'AI生图':'描述你想生成的画面','AI生视频':'描述你想创作的视频','PPT创作':'输入 PPT 主题，让想法变成演示文稿','代码':'描述你的编程需求','翻译':'输入需要翻译的内容','AI写作':'告诉我你想写什么','录音纪要':'粘贴录音文字，整理重点与待办','研究':'告诉我你想深入研究的问题','千问高考':'输入你的学习问题','音视频速读':'粘贴音视频文字，快速提炼重点'};
const banners = [
  { image:'work', title:'工作任务就交给千问工作助理', description:'专业技能搭配行业数据连接器，助理选的好，当然下班早', action:'立即体验' },
  { image:'input', title:'千问输入法 App 全新上线', description:'最快 300 字/分，说话即成稿，支持 9 种方言，无广告', action:'立即下载体验' },
  { image:'notes', title:'千问一键生成录音纪要', description:'断网也能稳定录，纪要自动整理，重要内容一句不漏', action:'立即下载体验' },
];

function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false; toastTimer = setTimeout(() => $('#toast').hidden = true, 3200); }
function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { toast('浏览器存储空间不足，本次内容暂未保存。'); } }
function saveConversations() { save('qwen-conversations', conversations); renderHistory(); }
function currentChat() { return conversations.find(chat => chat.id === currentId); }
function closePopover() { popover.hidden = true; activePopover?.setAttribute('aria-expanded', 'false'); activePopover = null; }
function openMenu(anchor, html, above = false) {
  if (activePopover === anchor && !popover.hidden) { closePopover(); return; }
  closePopover(); activePopover = anchor; anchor.setAttribute('aria-expanded', 'true');
  popover.innerHTML = html; popover.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = popover.offsetWidth, height = popover.offsetHeight;
  popover.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - width - 8))}px`;
  popover.style.top = `${Math.max(8, Math.min(above ? rect.top - height - 8 : rect.bottom + 6, innerHeight - height - 8))}px`;
  popover.querySelector('button')?.focus({ preventScroll: true });
}
function menuItem(label, iconName, attrs = '', selected = false, description = '') {
  return `<button class="menu-item${selected ? ' selected' : ''}" role="menuitem" ${attrs}>${icon(iconName)}<span>${escape(label)}${description ? `<p class="menu-description">${escape(description)}</p>` : ''}</span>${selected ? `<span class="check">${icon('check')}</span>` : ''}</button>`;
}
function showModelMenu(anchor) { openMenu(anchor, `<div class="menu-heading">${apiAvailable ? '当前服务端模型' : '选择模型'}</div>` + (apiAvailable ? [apiModel] : modelNames).map(name => menuItem(name, 'spark', `data-model="${escape(name)}"`, name === $('#model-name').textContent)).join('')); }
$('#model-button').onclick = event => showModelMenu(event.currentTarget);
$('#work-model-button').onclick = event => showModelMenu(event.currentTarget);
$('#speed-button').onclick = event => openMenu(event.currentTarget, ['快速','思考','深度研究'].map((name, i) => menuItem(name, ['bolt','spark','research'][i], `data-speed="${name}"`, speed === name, ['轻快响应，适合日常交流','深入思考，解决复杂问题','系统梳理，探索更多信息'][i])).join(''), true);
$('#more-button').onclick = event => openMenu(event.currentTarget, Object.keys(toolIcons).filter(tool => {
  const inline = $$('#daily-tools [data-tool]').find(button => button.dataset.tool === tool);
  return !inline || !inline.getClientRects().length;
}).map(tool => menuItem(tool, toolIcons[tool], `data-tool="${tool}"`, activeTool === tool)).join(''));
$('#attach-button').onclick = event => openMenu(event.currentTarget, menuItem('上传文件或图片', 'files', 'data-upload') + '<div class="menu-heading">支持文档、表格和图片，单个文件不超过 10 MB</div>', true);
$('#settings-button').onclick = event => openMenu(event.currentTarget, '<div class="menu-heading">外观设置</div>' + [['light','浅色模式','sun'],['dark','深色模式','moon'],['system','跟随系统','monitor']].map(([value,label,glyph]) => menuItem(label,glyph,`data-theme="${value}"`,readStorage('qwen-theme','light') === value)).join(''), true);
$('#cloud-button').onclick = () => toast('云端工作模式。连接真实模型后可处理工作任务。');

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light') : theme;
  if (persist) save('qwen-theme', theme);
}
setTheme(readStorage('qwen-theme','light'), false);
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { if (readStorage('qwen-theme','light') === 'system') setTheme('system',false); });

function toggleSidebar() {
  closePopover();
  if (innerWidth <= 760) app.classList.toggle('mobile-sidebar');
  else app.classList.toggle('sidebar-collapsed');
  syncSidebar();
  (innerWidth <= 760 && app.classList.contains('mobile-sidebar') ? $('.collapse-button') : $('.expand-button')).focus();
}
$$('[data-action="sidebar"]').forEach(button => button.onclick = toggleSidebar);
$('#sidebar-scrim').onclick = () => hideMobileSidebar();
function syncSidebar() {
  const mobileOpen = innerWidth <= 760 && app.classList.contains('mobile-sidebar');
  $('.sidebar').inert = innerWidth <= 760 ? !mobileOpen : app.classList.contains('sidebar-collapsed');
  $('.main').inert = mobileOpen;
}
function hideMobileSidebar() { app.classList.remove('mobile-sidebar'); syncSidebar(); }
function resetInput() { attachments = []; prompt.value = ''; renderAttachments(); resizePrompt(); updateSendButton(); }
function goHome() {
  if (busy) stopGeneration();
  currentId = null; home.hidden = false; $('#conversation').hidden = true; $('#feature-panel').hidden = true; $('#legal').hidden = false;
  home.insertBefore(composerWrap, $('#promo-wrap')); resetInput(); hideMobileSidebar(); closePopover(); renderHistory();
  prompt.focus({ preventScroll:true });
}
$('#new-chat').onclick = goHome;
$('#brand').onclick = goHome;

function setMode(value) {
  mode = value; activeTool = ''; app.classList.toggle('work-mode', mode === 'work');
  $$('[data-mode]').forEach(button => button.setAttribute('aria-selected', button.dataset.mode === mode));
  $('#daily-nav').hidden = mode === 'work'; $('#work-nav').hidden = mode !== 'work';
  $('#daily-tools').hidden = mode === 'work'; $('#work-tools').hidden = mode !== 'work';
  $('#work-suggestions').hidden = mode !== 'work'; $('#promo-wrap').hidden = mode === 'work';
  $('#project-select').hidden = mode !== 'work'; $('#new-label').textContent = mode === 'work' ? '新任务' : '新对话';
  $('#welcome-title').textContent = mode === 'work' ? '千问，你的办公助理' : '你好，我是千问';
  $('#welcome-icon').src = mode === 'work' ? '/assets/work.svg' : '/assets/qwen.svg';
  prompt.placeholder = mode === 'work' ? '今天一起做点什么？' : '向千问提问';
  $$('[data-tool]').forEach(button => button.setAttribute('aria-pressed','false'));
  $('#more-button').innerHTML = icon('more') + '更多'; $('#more-button').setAttribute('aria-pressed','false');
  goHome();
}
$$('[data-mode]').forEach(button => button.onclick = () => setMode(button.dataset.mode));
function selectTool(tool) {
  closePopover();
  if (tool === '工作助理') { setMode('work'); return; }
  activeTool = activeTool === tool ? '' : tool;
  $$('[data-tool]').forEach(button => button.setAttribute('aria-pressed', button.dataset.tool === activeTool));
  prompt.placeholder = placeholders[activeTool] || (mode === 'work' ? '今天一起做点什么？' : '向千问提问');
  if (activeTool && !$$('#daily-tools [data-tool]').some(button => button.dataset.tool === activeTool && button.getClientRects().length)) {
    $('#more-button').innerHTML = icon(toolIcons[activeTool]) + escape(activeTool);
    $('#more-button').setAttribute('aria-pressed', 'true');
  } else { $('#more-button').innerHTML = icon('more') + '更多'; $('#more-button').setAttribute('aria-pressed','false'); }
  prompt.focus({ preventScroll:true });
}

function historyHtml(query = '') {
  const filtered = conversations.filter(chat => chat.title?.toLowerCase().includes(query.toLowerCase()));
  return filtered.length ? `<div class="history-caption">历史对话</div>${filtered.map(chat => `<div class="history-item${chat.id === currentId ? ' active' : ''}"><button class="history-open" data-chat="${escape(chat.id)}" title="${escape(chat.title)}">${escape(chat.title)}</button><button class="history-delete icon-button" data-delete-chat="${escape(chat.id)}" aria-label="删除对话：${escape(chat.title)}">${icon('close')}</button></div>`).join('')}` : `<p class="empty-history">${query ? '没有找到相关对话' : '暂无对话'}</p>`;
}
function renderHistory(query = '') {
  $('#history').innerHTML = historyHtml();
  if ($('#search-results')) $('#search-results').innerHTML = historyHtml(query);
}
function openChat(id) {
  if (busy) stopGeneration();
  const chat = conversations.find(item => item.id === id); if (!chat) return;
  if (chat.mode !== mode) setMode(chat.mode || 'daily');
  currentId = id; home.hidden = true; $('#feature-panel').hidden = true; $('#conversation').hidden = false;
  $('#conversation-composer').append(composerWrap); resetInput(); renderMessages(); renderHistory(); hideMobileSidebar();
  if (dialog.open) dialog.close();
}
function renderMessages() {
  const chat = currentChat(); if (!chat) return;
  messagesElement.innerHTML = chat.messages.map((message,index) => message.role === 'user' ? `<div class="message user-message"><div class="user-bubble">${escape(message.content)}${message.files?.length ? `<div class="message-files">${message.files.map(file => `${icon('file')} ${escape(file.name)}`).join(' · ')}</div>` : ''}</div></div>` : `<div class="message assistant-message"><img class="assistant-avatar" src="/assets/qwen.svg" alt="千问"><div class="assistant-content"><div class="message-text" data-message-index="${index}">${renderMessage(message.content)}</div>${message.content ? `<div class="message-actions"><button class="icon-button" data-copy="${index}" aria-label="复制回答" title="复制">${icon('copy')}</button><button class="icon-button" data-retry="${index}" aria-label="重新生成" title="重新生成" ${busy ? 'disabled' : ''}>${icon('retry')}</button></div>` : '<div class="thinking" aria-label="正在生成"><i></i><i></i><i></i></div>'}</div></div>`).join('');
  scrollToBottom();
}
function scrollToBottom() { messagesElement.scrollTop = messagesElement.scrollHeight; }
messagesElement.addEventListener('scroll', () => { $('#scroll-bottom').hidden = messagesElement.scrollHeight - messagesElement.scrollTop - messagesElement.clientHeight < 160; });
$('#scroll-bottom').onclick = scrollToBottom;
function resizePrompt() { prompt.style.height = '50px'; prompt.style.height = `${Math.min(182, Math.max(mode === 'work' ? 54 : 50, prompt.scrollHeight))}px`; }
function updateSendButton() { $('#send-button').disabled = !busy && !prompt.value.trim() && !attachments.length; }
prompt.oninput = () => { resizePrompt(); updateSendButton(); };
prompt.addEventListener('compositionstart', () => isComposing = true);
prompt.addEventListener('compositionend', () => isComposing = false);
prompt.onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !isComposing) { event.preventDefault(); if (!$('#send-button').disabled) $('#composer').requestSubmit(); } };

async function addFiles(incoming) {
  closePopover();
  for (const file of incoming) {
    if (attachments.length >= 5) { toast('每次最多添加 5 个附件。'); break; }
    if (file.size > 10 * 1024 * 1024) { toast(`“${file.name}”超过 10 MB，暂未添加。`); continue; }
    const item = {id:crypto.randomUUID(),name:file.name,size:file.size,type:file.type,text:''};
    if (/\.(txt|md|csv|json)$/i.test(file.name) && file.size <= 100000) item.text = await file.text();
    attachments.push(item);
    files.unshift({id:item.id,name:item.name,size:item.size,type:item.type,date:new Date().toISOString()});
  }
  save('qwen-files',files.slice(0,100)); renderAttachments(); updateSendButton();
}
function renderAttachments() {
  $('#attachments').hidden = !attachments.length;
  $('#attachments').innerHTML = attachments.map(file => `<div class="attachment">${icon('file')}<div><div class="attachment-name" title="${escape(file.name)}">${escape(file.name)}</div><div class="attachment-size">${formatSize(file.size)}</div></div><button type="button" class="icon-button" data-remove-file="${file.id}" aria-label="移除 ${escape(file.name)}">${icon('close')}</button></div>`).join('');
}
$('#file-input').onchange = async event => { await addFiles([...event.target.files]); event.target.value = ''; };
$('#composer').addEventListener('dragover', event => { event.preventDefault(); $('#composer').classList.add('drag-over'); });
$('#composer').addEventListener('dragleave', () => $('#composer').classList.remove('drag-over'));
$('#composer').addEventListener('drop', event => { event.preventDefault(); $('#composer').classList.remove('drag-over'); addFiles([...event.dataTransfer.files]); });

function setBusy(value) {
  busy = value; $('#send-button').innerHTML = icon(value ? 'stop' : 'arrow-up');
  $('#send-button').setAttribute('aria-label', value ? '停止生成' : '发送消息');
  updateSendButton();
}
function stopGeneration() {
  abortController?.abort(); clearInterval(typingTimer);
  const chat = currentChat();
  if (chat?.messages.at(-1)?.role === 'assistant' && !chat.messages.at(-1).content) chat.messages.at(-1).content = '已停止生成。';
  setBusy(false); saveConversations(); renderMessages();
}
$('#composer').onsubmit = async event => {
  event.preventDefault(); if (busy) { stopGeneration(); return; }
  const content = prompt.value.trim(); if (!content && !attachments.length) return;
  if (!currentChat()) {
    const chat = {id:crypto.randomUUID(),title:(content || attachments[0].name).slice(0,26),mode,messages:[],createdAt:Date.now()};
    conversations.unshift(chat); currentId = chat.id;
    home.hidden = true; $('#feature-panel').hidden = true; $('#conversation').hidden = false; $('#conversation-composer').append(composerWrap);
  }
  const chat = currentChat();
  const inputFiles = attachments.map(file => ({name:file.name,text:file.text}));
  chat.messages.push({role:'user',content:content || '请查看附件',files:inputFiles,tool:activeTool});
  resetInput(); hideMobileSidebar(); saveConversations();
  await generateReply(chat);
};
async function generateReply(chat) {
  setBusy(true); abortController = new AbortController();
  const controller = abortController;
  const history = chat.messages.slice(-40).map(message => ({role:message.role,content:message.content + (message.files?.length ? '\n\n附件：\n' + message.files.map(file => file.text ? `文件 ${file.name}：\n${file.text}` : `文件 ${file.name}（当前仅有文件名，未解析文件内容）`).join('\n') : '')}));
  const reply = {role:'assistant',content:''}; chat.messages.push(reply); renderMessages();
  try {
    let answer;
    if (apiAvailable) {
      if (['AI生图','AI生视频'].includes(activeTool)) {
        answer = '当前接入的是文字对话模型，暂不支持直接生成图片或视频。可以切换到文字模式，先完善创作提示词。';
      } else {
        const response = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history,mode:speed,tool:activeTool}),signal:controller.signal});
        const result = await response.json(); if (!response.ok) throw new Error(result.error || '模型服务暂时不可用，请稍后重试。'); answer = result.content;
      }
    } else {
      answer = '这是本地演示回复。当前页面尚未连接 AI 模型，暂时无法回答问题或生成内容。\n\n你可以体验消息发送、新建对话、历史记录、附件选择和工作模式；对话会保存在当前浏览器中。\n\n连接模型服务后，即可在这个界面中进行真实的 AI 对话。';
    }
    if (controller.signal.aborted) return;
    let offset = 0;
    typingTimer = setInterval(() => {
      offset = Math.min(answer.length,offset + (apiAvailable ? 12 : 5)); reply.content = answer.slice(0,offset);
      const node = messagesElement.querySelector(`[data-message-index="${chat.messages.length - 1}"]`);
      if (node) { node.innerHTML = renderMessage(reply.content); node.parentElement.querySelector('.thinking')?.remove(); }
      if (messagesElement.scrollHeight - messagesElement.scrollTop - messagesElement.clientHeight < 200) scrollToBottom();
      if (offset === answer.length) { clearInterval(typingTimer); setBusy(false); saveConversations(); renderMessages(); }
    },22);
  } catch(error) {
    if (error.name === 'AbortError') return;
    reply.content = `暂时无法完成回复：${error.message}`; setBusy(false); saveConversations(); renderMessages();
  }
}

function showDialog(type) {
  closePopover();
  const content = $('#dialog-content');
  const intro = '<img class="dialog-logo" src="/assets/qwen.svg" alt="千问">';
  if (type === 'login') content.innerHTML = `${intro}<h2 class="center">欢迎使用千问</h2><p class="center">登录，开启你的 AI 助手之旅</p><button class="primary-button full" id="local-login">体验本地模式</button><a class="secondary-button full" href="https://www.qianwen.com/" target="_blank" rel="noopener noreferrer">前往千问官网登录</a><p class="fine-print">这是界面复刻演示，使用本地模式无需账号。<br>对话仅存储在当前浏览器，不会同步至千问账号。</p>`;
  if (type === 'download') content.innerHTML = `${intro}<h2 class="center">千问，随时在你身边</h2><p class="center">在电脑和手机上，让灵感与效率更进一步。</p><a class="primary-button full" href="https://www.qianwen.com/" target="_blank" rel="noopener noreferrer">${icon('download')}前往官网获取客户端</a><p class="fine-print">请从千问官网选择并下载适合你设备的版本。</p>`;
  if (type === 'about') content.innerHTML = `${intro}<h2 class="center">关于千问</h2><p class="center">你好，我是千问。<br>让每一个问题，都有新的可能。</p><p>本项目参照千问网站制作，用于界面学习和交互演示，并非千问官方网站。品牌和参考图片归原权利方所有。</p><p class="fine-print">${apiAvailable ? '已配置模型：' + escape(apiModel) : '当前为本地演示模式'} · 对话保存在当前浏览器</p>`;
  if (type === 'task') content.innerHTML = `<h2>新定时任务</h2><p>记录想让千问帮你完成的事。</p><form id="task-form"><label class="form-field">任务名称<input name="title" placeholder="例如：整理每周工作总结" required maxlength="60"></label><label class="form-field">任务内容<textarea name="content" placeholder="详细描述你的任务" required maxlength="2000"></textarea></label><label class="form-field">提醒时间<input name="time" type="datetime-local" required></label><button class="primary-button full" type="submit">保存到本地</button><p class="fine-print">本地演示仅保存任务，不会在后台自动执行或推送提醒。</p></form>`;
  if (type === 'project') content.innerHTML = `<h2>新建工作项目</h2><p>为相关任务创建一个专属空间。</p><form id="project-form"><label class="form-field">项目名称<input name="title" placeholder="例如：品牌设计、毕业论文" required maxlength="60"></label><button class="primary-button full" type="submit">创建项目</button></form>`;
  if (type === 'search') content.innerHTML = `<h2>搜索对话</h2><input class="search-input" id="search-input" placeholder="搜索历史对话" aria-label="搜索历史对话"><div id="search-results"></div>`;
  if (type === 'voice') content.innerHTML = `<h2>语音输入</h2><p>使用麦克风，将你的想法转成文字。</p><button id="start-voice" class="primary-button full">${icon('mic')}开始语音输入</button><p class="fine-print">开始后浏览器会请求麦克风权限。语音识别由浏览器提供，可能使用浏览器厂商的在线服务。</p>`;
  if (!dialog.open) dialog.showModal();
  if (type === 'search') { renderHistory(); $('#search-input').oninput = event => renderHistory(event.target.value); $('#search-input').focus(); }
  if ($('#local-login')) $('#local-login').onclick = () => { dialog.close(); $('.login-button').textContent = '本地用户'; toast('已进入本地模式，对话保存在当前浏览器。'); };
  if ($('#task-form')) $('#task-form').onsubmit = event => { event.preventDefault(); const data = new FormData(event.target); if (new Date(data.get('time')).getTime() <= Date.now()) { toast('请选择未来的提醒时间。'); return; } tasks.unshift({id:crypto.randomUUID(),title:data.get('title'),content:data.get('content'),time:data.get('time')}); save('qwen-tasks',tasks); renderTasks(); dialog.close(); toast('任务已保存到本地。'); };
  if ($('#project-form')) $('#project-form').onsubmit = event => { event.preventDefault(); const title = new FormData(event.target).get('title').trim(); if (!title) return; projects.unshift({id:crypto.randomUUID(),title}); save('qwen-projects',projects); dialog.close(); showPanel('projects'); };
  if ($('#start-voice')) $('#start-voice').onclick = startVoice;
}
$('.dialog-close').onclick = () => dialog.close();
dialog.addEventListener('click',event => { if (event.target === dialog) { const rect=dialog.getBoundingClientRect(); if (event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom) dialog.close(); } });
$('#search-history').onclick = () => showDialog('search');
function renderTasks() { $('#task-list').innerHTML = tasks.map(task => `<button class="nav-item" data-show-task="${escape(task.id)}" title="${escape(task.title)}">${icon('check')}${escape(task.title)}</button>`).join(''); }

const panels = {
  space: {title:'云空间',description:'你的灵感、资料和知识，都在这里。',icon:'files'},
  create: {title:'千问创作',description:'从一个想法开始，把灵感变成作品。',items:[['AI生图','描述画面，让灵感成为图像','image'],['AI生视频','让故事动起来，创作属于你的精彩','video'],['PPT创作','从主题到大纲，让表达更出色','presentation'],['AI写作','用文字记录灵感，让创作更轻松','write'],['代码','一起把想法变成可以运行的代码','code'],['翻译','跨越语言，让表达自由流动','translate']]},
  skills: {title:'技能',description:'为工作搭配专业技能，轻松处理不同任务。',items:[['写作助手','梳理思路，完成文案与内容创作','write'],['编程助手','代码解释、问题排查和程序设计','code'],['研究助手','拆解问题，整理研究方向和资料','research'],['PPT创作','生成结构清晰的演示文稿大纲','presentation'],['翻译助手','翻译润色，让沟通更加自然','translate'],['会议纪要','从文字中提炼重点、决策与待办','mic']]},
  connect: {title:'连接',description:'连接常用工具，将信息带入你的工作流程。',items:[['本地文件','选择文档、表格或图片作为任务参考','files'],['知识资料','将文字资料粘贴到对话，快速整理要点','book'],['更多连接','此演示尚未接入外部应用','connect']]},
  projects: {title:'项目',description:'把相关工作放在一起，让每一步都井井有条。',icon:'folder'},
};
function showPanel(name) {
  const panel = panels[name]; if (!panel) return;
  if (busy) stopGeneration(); closePopover(); hideMobileSidebar();
  home.hidden = true; $('#conversation').hidden = true; const target = $('#feature-panel'); target.hidden = false;
  $('#legal').hidden = true;
  let content = '';
  if (panel.items) content = `<div class="feature-grid">${panel.items.map(([title,description,glyph]) => `<button class="feature-card" data-card="${escape(title)}" data-source-panel="${name}">${icon(glyph)}<h3>${escape(title)}</h3><p>${escape(description)}</p></button>`).join('')}</div>`;
  if (name === 'space') content = files.length ? files.map(file => `<div class="file-row">${icon('file')}<div class="file-info">${escape(file.name)}<small>${formatSize(file.size)} · ${new Date(file.date).toLocaleDateString('zh-CN')}</small></div><button class="icon-button" data-delete-file="${file.id}" aria-label="移除文件记录">${icon('trash')}</button></div>`).join('') : `<div class="empty-panel">${icon('files')}暂时还没有文件<br><br>添加文件，开始整理你的资料。</div>`;
  if (name === 'projects') content = projects.length ? projects.map(project => `<div class="project-list-row"><button class="project-row" data-project="${project.id}">${icon('folder')}${escape(project.title)}</button><button class="icon-button" data-delete-project="${project.id}" aria-label="删除项目：${escape(project.title)}">${icon('trash')}</button></div>`).join('') : `<div class="empty-panel">${icon('folder')}创建你的第一个工作项目</div>`;
  target.innerHTML = `<div class="panel-heading"><h1>${panel.title}</h1>${name === 'space' ? '<button class="primary-button" data-upload>添加文件</button>' : name === 'projects' ? '<button class="primary-button" data-dialog="project">新建项目</button>' : ''}</div><p class="panel-subtitle">${panel.description}${name === 'space' ? '<br>本地演示仅保存文件记录；文本附件可供模型读取，其他文件暂未解析。' : ''}</p>${content}`;
}
$('#project-select').onclick = event => openMenu(event.currentTarget, '<div class="menu-heading">工作项目</div>' + (projects.map(project => menuItem(project.title,'folder',`data-project="${project.id}"`,selectedProject === project.id)).join('') || '<div class="menu-heading">还没有工作项目</div>') + menuItem('新建项目','plus','data-dialog="project"'));

function setSlide(value) {
  slide = value; const banner = banners[value];
  $('#promo-image').src = `/assets/banner-${banner.image}.webp`; $('#promo-image').alt = banner.title;
  $('#promo-title').textContent = banner.title; $('#promo-description').textContent = banner.description; $('#promo-cta').textContent = banner.action;
  $$('[data-slide]').forEach(button => { button.classList.toggle('active',Number(button.dataset.slide) === slide); button.setAttribute('aria-pressed', Number(button.dataset.slide) === slide); });
}
$$('[data-slide]').forEach(button => button.onclick = () => setSlide(Number(button.dataset.slide)));
let rotating = setInterval(() => { if (!home.hidden && mode === 'daily' && !document.hidden && !$('#promo-wrap').matches(':hover')) setSlide((slide + 1) % 3); }, 6500);
$('#promo-close').onclick = () => { $('#promo-wrap').hidden = true; clearInterval(rotating); };
$('#promo-cta').onclick = () => slide === 0 ? setMode('work') : showDialog('download');

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { dialog.close(); toast('当前浏览器不支持语音识别，请使用支持此功能的 Chrome 或 Edge。'); return; }
  recognition = new SpeechRecognition(); recognition.lang = 'zh-CN'; recognition.continuous = false; recognition.interimResults = false;
  recognition.onresult = event => { prompt.value += event.results[0][0].transcript; resizePrompt(); updateSendButton(); };
  recognition.onerror = event => toast(event.error === 'not-allowed' ? '未获得麦克风权限，可以继续使用文字输入。' : '语音识别未完成，请再试一次。');
  recognition.onend = () => { $('#voice-button').classList.remove('recording'); $('#voice-button').setAttribute('aria-label','语音输入'); };
  try { recognition.start(); dialog.close(); $('#voice-button').classList.add('recording'); $('#voice-button').setAttribute('aria-label','停止语音输入'); } catch { toast('语音输入暂时不可用。'); }
}
$('#voice-button').onclick = () => { if ($('#voice-button').classList.contains('recording')) recognition?.stop(); else showDialog('voice'); };

document.addEventListener('click',async event => {
  const target = event.target.closest('button, a');
  if (!popover.hidden && !popover.contains(event.target) && !activePopover?.contains(event.target)) closePopover();
  if (!target) return;
  if (target.dataset.tool) selectTool(target.dataset.tool);
  if (target.dataset.model) { $('#model-name').textContent = target.dataset.model; $('#work-model-button').innerHTML = escape(apiAvailable ? apiModel : target.dataset.model.replace('-千问','-Max')) + icon('chevron'); closePopover(); }
  if (target.dataset.speed) { speed = target.dataset.speed; $('#speed-label').textContent = speed; closePopover(); }
  if (target.dataset.theme) { setTheme(target.dataset.theme); closePopover(); }
  if (target.hasAttribute('data-upload')) { closePopover(); $('#file-input').click(); }
  if (target.dataset.removeFile) { attachments = attachments.filter(file => file.id !== target.dataset.removeFile); renderAttachments(); updateSendButton(); }
  if (target.dataset.dialog) showDialog(target.dataset.dialog);
  if (target.dataset.panel) showPanel(target.dataset.panel);
  if (target.dataset.chat) { $('#legal').hidden = false; openChat(target.dataset.chat); }
  if (target.dataset.deleteChat) { if (target.dataset.deleteChat === currentId) goHome(); conversations = conversations.filter(chat => chat.id !== target.dataset.deleteChat); saveConversations(); }
  if (target.dataset.prompt) { prompt.value = target.dataset.prompt; resizePrompt(); updateSendButton(); prompt.focus(); }
  if (target.dataset.copy !== undefined) {
    try { await navigator.clipboard.writeText(currentChat().messages[Number(target.dataset.copy)].content); toast('回答已复制。'); } catch { toast('复制失败，请选中文字后复制。'); }
  }
  if (target.dataset.retry !== undefined && !busy) { const chat = currentChat(); chat.messages = chat.messages.slice(0,Number(target.dataset.retry)); await generateReply(chat); }
  if (target.dataset.project) {
    selectedProject = target.dataset.project; $('#project-label').textContent = projects.find(project => project.id === selectedProject)?.title || '选择工作项目';
    closePopover(); goHome();
  }
  if (target.dataset.card) {
    const value = target.dataset.card;
    if (value === '更多连接') { toast('当前为本地演示，尚未接入外部应用。'); return; }
    goHome(); $('#legal').hidden = false;
    if (value === '本地文件') $('#file-input').click();
    else selectTool({'写作助手':'AI写作','编程助手':'代码','研究助手':'研究','翻译助手':'翻译','会议纪要':'录音纪要','知识资料':'研究'}[value] || value);
  }
  if (target.dataset.deleteFile) { files = files.filter(file => file.id !== target.dataset.deleteFile); save('qwen-files',files); showPanel('space'); }
  if (target.dataset.deleteProject) {
    projects = projects.filter(project => project.id !== target.dataset.deleteProject); save('qwen-projects',projects);
    if (selectedProject === target.dataset.deleteProject) { selectedProject = ''; $('#project-label').textContent = '选择工作项目'; }
    showPanel('projects');
  }
  if (target.dataset.showTask) {
    const task = tasks.find(item => item.id === target.dataset.showTask);
    $('#dialog-content').innerHTML = `<h2>${escape(task.title)}</h2><p>${escape(task.content)}</p><p>计划时间：${escape(task.time.replace('T',' '))}</p><p class="fine-print">本地记录，不会在后台自动执行。</p><button class="secondary-button full" data-delete-task="${task.id}">删除任务</button>`; dialog.showModal();
  }
  if (target.dataset.deleteTask) { tasks = tasks.filter(task => task.id !== target.dataset.deleteTask); save('qwen-tasks',tasks); renderTasks(); dialog.close(); }
});
document.addEventListener('keydown',event => {
  if (event.key === 'Escape') { closePopover(); hideMobileSidebar(); }
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') { event.preventDefault(); showDialog('search'); }
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'o') { event.preventDefault(); goHome(); }
  if (!popover.hidden && ['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
    const options = [...popover.querySelectorAll('button')]; const index = options.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
    event.preventDefault(); options[next]?.focus();
  }
});
window.addEventListener('resize',() => { closePopover(); syncSidebar(); });
window.addEventListener('beforeunload',() => { if (busy) saveConversations(); });
renderHistory(); renderTasks(); syncSidebar();
fetch('/api/status').then(response => response.ok ? response.json() : null).then(status => {
  apiAvailable = !!status?.configured;
  if (apiAvailable && typeof status.model === 'string') {
    apiModel = status.model;
    $('#model-name').textContent = apiModel;
    $('#work-model-button').innerHTML = escape(apiModel) + icon('chevron');
  }
}).catch(() => {});
