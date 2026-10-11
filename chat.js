export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function renderMessage(value) {
  // Escape all model output before adding the small supported Markdown subset.
  return String(value).split(/(```[\s\S]*?```)/g).map(part => {
    if (part.startsWith('```')) {
      const code = part.slice(3, -3).replace(/^[\w+-]*\n/, '');
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    }
    return escapeHtml(part)
      .replace(/^###? (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>');
  }).join('');
}

export function validateMessages(messages) {
  return Array.isArray(messages) && messages.length > 0 && messages.length <= 100 &&
    messages.every(message => message && ['user', 'assistant'].includes(message.role) &&
      typeof message.content === 'string' && message.content.length > 0 && message.content.length <= 50000);
}

export function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
