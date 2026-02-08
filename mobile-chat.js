(function() {
  'use strict';

  var MOBILE_MAX_WIDTH = 640;

  function isMobile() {
    return typeof window !== 'undefined' && window.innerWidth <= MOBILE_MAX_WIDTH;
  }

  // Mobile Chat Widget - Telegram-style, mobile only
  function MobileChatWidget(config) {
    this.apiKey = config.apiKey;
    this.agentId = config.agentId;
    this.apiUrl = config.apiUrl || (window.location && window.location.origin ? window.location.origin.replace(':3000', ':8000') : '');
    this.containerId = config.containerId || 'mobile-chat-' + config.agentId;
    this.title = config.title || 'Chat';
    this.debug = config.debug || false;
    this.threadId = null;
    this.messages = [];
    this.agentData = null;

    this.init();
  }

  MobileChatWidget.prototype.init = function() {
    this.createWidget();
    this.loadAgentData().then(function() {
      this.loadThread();
    }.bind(this));
  };

  MobileChatWidget.prototype.createWidget = function() {
    var container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      document.body.appendChild(container);
    }

    var styles = [
      '*{box-sizing:border-box}',
      '.mc-root{position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#e4ddd6}',
      '.mc-header{background:#f0f0f0;padding:12px 16px;padding-top:calc(12px + env(safe-area-inset-top));display:flex;align-items:center;gap:12px;border-bottom:1px solid #e0e0e0;min-height:56px}',
      '.mc-header-title{flex:1;font-size:17px;font-weight:600;color:#000;margin:0}',
      '.mc-messages{flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 12px;-webkit-overflow-scrolling:touch;scroll-behavior:smooth}',
      '.mc-msg{display:flex;margin-bottom:4px;clear:both}',
      '.mc-msg.user{justify-content:flex-end}',
      '.mc-msg.assistant{justify-content:flex-start}',
      '.mc-bubble{max-width:85%;padding:8px 12px;border-radius:12px;font-size:15px;line-height:1.4;word-wrap:break-word;position:relative}',
      '.mc-msg.user .mc-bubble{background:#effdde;border-top-right-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.07)}',
      '.mc-msg.assistant .mc-bubble{background:#fff;border-top-left-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.1)}',
      '.mc-bubble .mc-p{margin:0 0 8px 0;line-height:1.5}.mc-bubble .mc-p:last-child{margin-bottom:0}',
      '.mc-bubble .mc-h1{font-size:1.15em;font-weight:700;margin:10px 0 6px 0;line-height:1.3}',
      '.mc-bubble .mc-h2{font-size:1.08em;font-weight:600;margin:8px 0 4px 0;line-height:1.3}',
      '.mc-bubble .mc-h3{font-size:1em;font-weight:600;margin:6px 0 4px 0;line-height:1.3}',
      '.mc-bubble .mc-ul,.mc-bubble .mc-ol{margin:6px 0;padding-left:1.25em}',
      '.mc-bubble .mc-ul{list-style-type:disc}.mc-bubble .mc-ol{list-style-type:decimal}',
      '.mc-bubble .mc-li{margin:2px 0;line-height:1.45}',
      '.mc-bubble .mc-blockquote{border-left:3px solid rgba(0,0,0,.15);padding-left:10px;margin:6px 0;color:rgba(0,0,0,.75);font-style:italic}',
      '.mc-bubble .mc-hr{border:none;border-top:1px solid rgba(0,0,0,.1);margin:8px 0}',
      '.mc-bubble .mc-link{color:#2481cc;text-decoration:none}',
      '.mc-bubble .mc-link:hover{text-decoration:underline}',
      '.mc-bubble .mc-img{max-width:100%;height:auto;border-radius:8px;margin:6px 0;display:block}',
      '.mc-bubble .mc-inline-code,.mc-bubble .mc-code{background:rgba(0,0,0,.08);padding:2px 6px;border-radius:4px;font-size:0.9em;font-family:ui-monospace,monospace}',
      '.mc-bubble .mc-pre{background:rgba(0,0,0,.06);padding:10px 12px;border-radius:8px;overflow-x:auto;margin:8px 0;font-size:13px;line-height:1.4}',
      '.mc-bubble .mc-pre .mc-code{padding:0;background:transparent;font-size:inherit}',
      '.mc-bubble .mc-strong{font-weight:600}.mc-bubble .mc-em{font-style:italic}',
      '.mc-loading{display:inline-flex;align-items:center;gap:6px;padding:8px 12px}',
      '.mc-loading span{width:6px;height:6px;border-radius:50%;background:#999;animation:mc-blink 1.2s ease-in-out infinite both}',
      '.mc-loading span:nth-child(2){animation-delay:.2s}.mc-loading span:nth-child(3){animation-delay:.4s}',
      '@keyframes mc-blink{0%,80%,100%{opacity:.4;transform:scale(1)}40%{opacity:1;transform:scale(1.1)}}',
      '.mc-input-row{background:#f0f0f0;padding:8px 12px;padding-bottom:calc(8px + env(safe-area-inset-bottom));display:flex;gap:8px;align-items:center;border-top:1px solid #e0e0e0}',
      '.mc-input{flex:1;border:none;border-radius:20px;padding:10px 16px;font-size:16px;background:#fff;outline:none;min-height:40px;-webkit-appearance:none}',
      '.mc-send{width:40px;height:40px;border-radius:50%;border:none;background:#34aadc;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}',
      '.mc-send:disabled{opacity:.5;cursor:not-allowed}',
      '.mc-send svg{width:20px;height:20px}',
      '.mc-markdown-content p{margin:0 0 6px}.mc-markdown-content p:last-child{margin:0}'
    ].join('');

    var styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    container.innerHTML =
      '<div class="mc-root">' +
        '<div class="mc-header">' +
          '<h1 class="mc-header-title">' + this.escapeHtml(this.title) + '</h1>' +
        '</div>' +
        '<div class="mc-messages" id="' + this.containerId + '-messages"></div>' +
        '<div class="mc-input-row">' +
          '<input type="text" class="mc-input" id="' + this.containerId + '-input" placeholder="Message" autocomplete="off" />' +
          '<button type="button" class="mc-send" id="' + this.containerId + '-send" aria-label="Send">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>';

    var self = this;
    document.getElementById(this.containerId + '-send').addEventListener('click', function() { self.sendMessage(); });
    document.getElementById(this.containerId + '-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') self.sendMessage();
    });
  };

  MobileChatWidget.prototype.escapeHtml = function(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  MobileChatWidget.prototype.preprocessTextOnlyTools = function(content) {
    if (!content || typeof content !== 'string') return content || '';
    content = content.replace(/<function_calls>\s*<invoke name="ask">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, '$1');
    content = content.replace(/<function_calls>\s*<invoke name="complete">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, '$1');
    return content.replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, ' ').replace(/\s+/g, ' ').trim();
  };

  MobileChatWidget.prototype.parseFunctionCalls = function(text) {
    var clean = this.preprocessTextOnlyTools(text || '');
    return { text: clean, functionCalls: null };
  };

  MobileChatWidget.prototype.processInlineMarkdown = function(text) {
    if (!text || typeof text !== 'string') return '';
    var self = this;
    var codeBlocks = [];
    var html = text.replace(/`([^`]+)`/g, function(_, code) {
      codeBlocks.push(self.escapeHtml(code));
      return '\x01C' + (codeBlocks.length - 1) + '\x01';
    });
    html = self.escapeHtml(html);
    html = html.replace(/\x01C(\d+)\x01/g, function(_, n) {
      return '<code class="mc-inline-code">' + codeBlocks[parseInt(n, 10)] + '</code>';
    });
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="mc-img"/>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="mc-link">$1</a>');
    html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="mc-strong">$1</strong>');
    html = html.replace(/__([^_]+?)__/g, '<strong class="mc-strong">$1</strong>');
    html = html.replace(/\*([^*\n]+?)\*/g, '<em class="mc-em">$1</em>');
    html = html.replace(/_([^_\n]+?)_/g, '<em class="mc-em">$1</em>');
    return html;
  };

  MobileChatWidget.prototype.renderMarkdown = function(text) {
    if (!text || typeof text !== 'string') return '';
    var lines = text.split('\n');
    var processed = [];
    var inCodeBlock = false;
    var codeContent = [];
    var inList = false;
    var listType = null;
    var listItems = [];
    var self = this;

    function closeList() {
      if (inList && listItems.length) {
        processed.push('<' + listType + ' class="mc-ul">' + listItems.join('') + '</' + listType + '>');
        listItems = [];
      }
      inList = false;
      listType = null;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();

      if (t.startsWith('```')) {
        if (inCodeBlock) {
          processed.push('<pre class="mc-pre"><code class="mc-code">' + self.escapeHtml(codeContent.join('\n')) + '</code></pre>');
          codeContent = [];
          inCodeBlock = false;
        } else {
          closeList();
          inCodeBlock = true;
        }
        continue;
      }
      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      if (t.startsWith('### ')) { closeList(); processed.push('<h3 class="mc-h3">' + self.processInlineMarkdown(t.slice(4)) + '</h3>'); continue; }
      if (t.startsWith('## ')) { closeList(); processed.push('<h2 class="mc-h2">' + self.processInlineMarkdown(t.slice(3)) + '</h2>'); continue; }
      if (t.startsWith('# ')) { closeList(); processed.push('<h1 class="mc-h1">' + self.processInlineMarkdown(t.slice(2)) + '</h1>'); continue; }
      if (t === '---' || t === '***') { closeList(); processed.push('<hr class="mc-hr"/>'); continue; }

      var ulMatch = t.match(/^[\*\-+] (.+)$/);
      var olMatch = t.match(/^\d+\. (.+)$/);
      if (ulMatch || olMatch) {
        var curType = ulMatch ? 'ul' : 'ol';
        var itemText = ulMatch ? ulMatch[1] : olMatch[1];
        if (inList && listType !== curType) closeList();
        if (!inList) { listType = curType; inList = true; }
        listItems.push('<li class="mc-li">' + self.processInlineMarkdown(itemText) + '</li>');
        continue;
      }
      if (inList && t !== '') closeList();
      if (t.startsWith('> ')) {
        processed.push('<blockquote class="mc-blockquote">' + self.processInlineMarkdown(t.slice(2)) + '</blockquote>');
        continue;
      }
      if (t === '') {
        processed.push('');
      } else {
        processed.push(self.processInlineMarkdown(line));
      }
    }

    if (inCodeBlock && codeContent.length) {
      processed.push('<pre class="mc-pre"><code class="mc-code">' + self.escapeHtml(codeContent.join('\n')) + '</code></pre>');
    }
    closeList();

    var joined = processed.join('\n');
    var paras = joined.split(/\n\n+/);
    var html = paras.map(function(para) {
      para = para.trim();
      if (!para) return '';
      if (/^<(h[1-6]|ul|ol|pre|blockquote|hr|li)/.test(para)) return para;
      return '<p class="mc-p">' + para + '</p>';
    }).join('');
    return html;
  };

  MobileChatWidget.prototype.loadAgentData = function() {
    var self = this;
    if (!this.agentId) return Promise.resolve();
    return fetch(this.apiUrl + '/agents/' + this.agentId, {
      method: 'GET',
      headers: { 'X-API-Key': this.apiKey }
    }).then(function(r) {
      if (r.ok) return r.json().then(function(data) { self.agentData = data; });
    }).catch(function(err) {
      if (self.debug) console.error('MobileChat: loadAgentData', err);
    });
  };

  MobileChatWidget.prototype.loadThread = function() {
    var self = this;
    fetch(this.apiUrl + '/threads', {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey },
      body: new FormData()
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
      return r.json();
    }).then(function(data) {
      self.threadId = data.thread_id;
      self.renderSavedMessages();
      if (self.messages.length === 0 && self.agentData && self.agentData.greeting_message) {
        self.showGreetingMessage();
      }
    }).catch(function(err) {
      if (self.debug) console.error('MobileChat: loadThread', err);
      self.addMessage('assistant', "Couldn't connect. Check your API key.");
    });
  };

  MobileChatWidget.prototype.showGreetingMessage = function() {
    if (!this.agentData || !this.agentData.greeting_message || !this.agentData.greeting_message.trim()) return;
    var el = document.getElementById(this.containerId + '-messages');
    if (!el || el.querySelector('.mc-greeting')) return;
    if (this.messages.length > 0) return;
    var div = document.createElement('div');
    div.className = 'mc-msg assistant mc-greeting';
    var bubble = document.createElement('div');
    bubble.className = 'mc-bubble';
    bubble.innerHTML = '<div class="mc-markdown-content">' + this.renderMarkdown(this.agentData.greeting_message) + '</div>';
    div.appendChild(bubble);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
  };

  MobileChatWidget.prototype.renderSavedMessages = function() {
    var el = document.getElementById(this.containerId + '-messages');
    if (!el) return;
    el.innerHTML = '';
    for (var i = 0; i < this.messages.length; i++) {
      var msg = this.messages[i];
      var row = document.createElement('div');
      row.id = msg.id;
      row.className = 'mc-msg ' + msg.type;
      var bubble = document.createElement('div');
      bubble.className = 'mc-bubble';
      var parsed = this.parseFunctionCalls(msg.text);
      if (parsed.text) {
        var inner = document.createElement('div');
        inner.className = 'mc-markdown-content';
        inner.innerHTML = this.renderMarkdown(parsed.text);
        bubble.appendChild(inner);
      }
      row.appendChild(bubble);
      el.appendChild(row);
    }
    el.scrollTop = el.scrollHeight;
    if (this.messages.length === 0 && this.agentData && this.agentData.greeting_message) {
      this.showGreetingMessage();
    }
  };

  MobileChatWidget.prototype.addMessage = function(type, text) {
    var el = document.getElementById(this.containerId + '-messages');
    if (!el) return null;
    var existingGreeting = el.querySelector('.mc-greeting');
    if (existingGreeting && this.messages.length === 0) existingGreeting.remove();
    var id = 'msg-' + Date.now() + '-' + Math.random();
    var row = document.createElement('div');
    row.id = id;
    row.className = 'mc-msg ' + type;
    var bubble = document.createElement('div');
    bubble.className = 'mc-bubble';
    var parsed = this.parseFunctionCalls(text);
    if (parsed.text) {
      var inner = document.createElement('div');
      inner.className = 'mc-markdown-content';
      inner.innerHTML = this.renderMarkdown(parsed.text);
      bubble.appendChild(inner);
    }
    row.appendChild(bubble);
    el.appendChild(row);
    el.scrollTop = el.scrollHeight;
    this.messages.push({ id: id, type: type, text: text });
    return id;
  };

  MobileChatWidget.prototype.addLoadingMessage = function() {
    var el = document.getElementById(this.containerId + '-messages');
    if (!el) return null;
    var id = 'loading-' + Date.now();
    var row = document.createElement('div');
    row.id = id;
    row.className = 'mc-msg assistant';
    row.innerHTML = '<div class="mc-bubble"><div class="mc-loading"><span></span><span></span><span></span></div></div>';
    el.appendChild(row);
    el.scrollTop = el.scrollHeight;
    return id;
  };

  MobileChatWidget.prototype.updateMessage = function(messageId, text) {
    var idx = this.messages.findIndex(function(m) { return m.id === messageId; });
    if (idx !== -1) {
      this.messages[idx].text = text;
    }
    var row = document.getElementById(messageId);
    if (!row) return;
    var bubble = row.querySelector('.mc-bubble');
    if (!bubble) return;
    var parsed = this.parseFunctionCalls(text);
    bubble.innerHTML = '';
    if (parsed.text) {
      var inner = document.createElement('div');
      inner.className = 'mc-markdown-content';
      inner.innerHTML = this.renderMarkdown(parsed.text);
      bubble.appendChild(inner);
    }
    var list = document.getElementById(this.containerId + '-messages');
    if (list) list.scrollTop = list.scrollHeight;
  };

  MobileChatWidget.prototype.removeMessage = function(messageId) {
    var el = document.getElementById(messageId);
    if (el) el.remove();
  };

  MobileChatWidget.prototype.sendMessage = function() {
    var input = document.getElementById(this.containerId + '-input');
    if (!input) return;
    var text = (input.value || '').trim();
    if (!text || !this.threadId) return;
    input.value = '';
    input.disabled = true;
    var sendBtn = document.getElementById(this.containerId + '-send');
    if (sendBtn) sendBtn.disabled = true;
    var self = this;
    this.addMessage('user', text);
    var loadingId = this.addLoadingMessage();
    var assistantMessageId = null;
    var fullText = '';
    var streamClosed = false;
    var loadingRemoved = false;

    function safeJsonParse(str, def) {
      try { return JSON.parse(str); } catch (e) { return def; }
    }

    function handleStreamMessage(rawData) {
      if (streamClosed) return;
      var data = rawData;
      if (data.indexOf('data: ') === 0) data = data.slice(6).trim();
      if (!data) return;
      try {
        var msg = safeJsonParse(data, null);
        if (!msg) return;
        if (msg.type === 'status' && msg.status && ['completed', 'stopped', 'failed'].indexOf(msg.status) !== -1) {
          streamClosed = true;
          return;
        }
        if (msg.type === 'assistant') {
          var content = safeJsonParse(msg.content, {});
          var meta = safeJsonParse(msg.metadata, {});
          if (meta.stream_status === 'chunk' && content.content) {
            if (!loadingRemoved) {
              self.removeMessage(loadingId);
              loadingRemoved = true;
              assistantMessageId = self.addMessage('assistant', '');
            }
            fullText += content.content;
            self.updateMessage(assistantMessageId, fullText);
          } else if (meta.stream_status === 'complete') {
            if (!loadingRemoved) {
              self.removeMessage(loadingId);
              loadingRemoved = true;
              if (!assistantMessageId) assistantMessageId = self.addMessage('assistant', fullText || '');
            }
          } else if (content.content && !loadingRemoved) {
            self.removeMessage(loadingId);
            loadingRemoved = true;
            fullText += content.content;
            assistantMessageId = self.addMessage('assistant', fullText);
          }
        }
      } catch (e) {}
    }

    fetch(this.apiUrl + '/threads/' + this.threadId + '/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': this.apiKey },
      body: JSON.stringify({ type: 'user', content: text, is_llm_message: true })
    }).then(function() {
      return fetch(self.apiUrl + '/thread/' + self.threadId + '/agent/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': self.apiKey },
        body: JSON.stringify({
          stream: true,
          agent_id: self.agentId
        })
      });
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
      return r.json();
    }).then(function(data) {
      var agentRunId = data.agent_run_id;
      if (!agentRunId) throw new Error('No agent run ID');
      return fetch(self.apiUrl + '/agent-run/' + agentRunId + '/stream', {
        method: 'GET',
        headers: { 'X-API-Key': self.apiKey }
      });
    }).then(function(r) {
      if (!r.ok) throw new Error('Stream failed');
      return r.body.getReader();
    }).then(function(reader) {
      var decoder = new TextDecoder();
      var buffer = '';
      function pump() {
        return reader.read().then(function(_ref) {
          var done = _ref.done;
          var value = _ref.value;
          if (done) {
            if (buffer.trim()) {
              buffer.split('\n').forEach(function(line) {
                if (line.trim().indexOf('data: ') === 0) handleStreamMessage(line);
              });
            }
            if (!loadingRemoved) {
              self.removeMessage(loadingId);
              if (!fullText.trim()) self.addMessage('assistant', 'No response. Try again.');
            }
            input.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
            if (input) input.focus();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';
          lines.forEach(function(line) {
            if (line.trim() && line.indexOf('data: ') === 0) handleStreamMessage(line);
          });
          return pump();
        });
      }
      return pump();
    }).catch(function(err) {
      if (self.debug) console.error('MobileChat: sendMessage', err);
      if (!loadingRemoved) self.removeMessage(loadingId);
      input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    });
  };

  function initMobileChat() {
    var scripts = document.querySelectorAll('script[data-agent-id]');
    scripts.forEach(function(script) {
      var isMobileChat = script.getAttribute('data-widget') === 'mobile-chat' ||
        (script.src && script.src.indexOf('mobile-chat') !== -1);
      if (!isMobileChat) return;
      var agentId = script.getAttribute('data-agent-id');
      var widgetKey = script.getAttribute('data-widget-key');
      var apiKey = script.getAttribute('data-api-key');
      var key = widgetKey || apiKey;
      if (!key || key === 'YOUR_API_KEY' || key === 'YOUR_WIDGET_KEY') {
        console.error('MobileChat: Set data-widget-key or data-api-key');
        return;
      }
      if (!agentId) {
        console.error('MobileChat: data-agent-id is required');
        return;
      }
      new MobileChatWidget({
        apiKey: key,
        agentId: agentId,
        apiUrl: script.getAttribute('data-api-url'),
        title: script.getAttribute('data-title') || 'Chat',
        containerId: 'mobile-chat-' + agentId,
        debug: script.getAttribute('data-debug') === 'true'
      });
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMobileChat);
    } else {
      initMobileChat();
    }
  }

  window.MobileChatWidget = MobileChatWidget;
})();
