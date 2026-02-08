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
      '.mc-markdown-content p{margin:0 0 6px}.mc-markdown-content p:last-child{margin:0}',
      '.mc-function-calls{margin-top:12px;padding:12px;background:rgba(0,0,0,.06);border-radius:12px;border:1px solid rgba(0,0,0,.08);font-size:13px}',
      '.mc-function-calls-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-weight:600;color:#555;cursor:pointer;user-select:none}',
      '.mc-function-calls-header:hover{color:#34aadc}',
      '.mc-function-calls-icon{width:16px;height:16px;flex-shrink:0;transition:transform .2s}',
      '.mc-function-calls-icon.collapsed{transform:rotate(-90deg)}',
      '.mc-function-calls-content{display:block}',
      '.mc-function-calls-content.collapsed{display:none}',
      '.mc-function-call{margin-bottom:10px;padding:10px;background:#fff;border-radius:8px;border-left:3px solid #34aadc}',
      '.mc-function-call:last-child{margin-bottom:0}',
      '.mc-function-name{font-weight:600;color:#34aadc;margin-bottom:6px;display:flex;align-items:center;flex-wrap:wrap;gap:6px}',
      '.mc-function-icon{margin-right:6px}',
      '.mc-function-param-preview{color:#666;font-weight:normal;font-size:12px;margin-left:4px}',
      '.mc-function-params{margin-top:6px;padding-top:6px;border-top:1px solid rgba(0,0,0,.08)}',
      '.mc-function-param{margin-bottom:4px;font-size:12px;color:#666}',
      '.mc-function-param-name{font-weight:500;color:#555}',
      '.mc-function-param-value{margin-left:8px;color:#333}'
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

  // --- Tool/function calls (mirrored from widget.js, themed with mc-) ---
  MobileChatWidget.prototype.isNewXmlFormat = function(content) {
    return content && /<function_calls>[\s\S]*<invoke\s+name=/.test(content);
  };

  MobileChatWidget.prototype.parseParameterValue = function(value) {
    var trimmed = (value && value.trim) ? value.trim() : String(value).trim();
    if (trimmed.indexOf('{') === 0 || trimmed.indexOf('[') === 0) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        return value;
      }
    }
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      var num = parseFloat(trimmed);
      if (!isNaN(num)) return num;
    }
    return value;
  };

  MobileChatWidget.prototype.parseXmlToolCalls = function(content) {
    var toolCalls = [];
    var functionCallsRegex = /<function_calls>([\s\S]*?)<\/function_calls>/gi;
    var functionCallsMatch;
    while ((functionCallsMatch = functionCallsRegex.exec(content)) !== null) {
      var functionCallsContent = functionCallsMatch[1];
      var invokeRegex = /<invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/invoke>/gi;
      var invokeMatch;
      while ((invokeMatch = invokeRegex.exec(functionCallsContent)) !== null) {
        var functionName = invokeMatch[1].replace(/_/g, '-');
        var invokeContent = invokeMatch[2];
        var parameters = {};
        var paramRegex = /<parameter\s+name=["']([^"']+)["']>([\s\S]*?)<\/parameter>/gi;
        var paramMatch;
        while ((paramMatch = paramRegex.exec(invokeContent)) !== null) {
          parameters[paramMatch[1]] = this.parseParameterValue(paramMatch[2].trim());
        }
        toolCalls.push({ functionName: functionName, parameters: parameters });
      }
    }
    return toolCalls;
  };

  MobileChatWidget.prototype.preprocessTextOnlyTools = function(content) {
    if (!content || typeof content !== 'string') return content || '';
    content = content.replace(/<function_calls>\s*<invoke name="ask">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, function(match) {
      if (match.indexOf('<parameter name="attachments"') !== -1) return match;
      return match.replace(/<function_calls>\s*<invoke name="ask">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, '$1');
    });
    content = content.replace(/<function_calls>\s*<invoke name="complete">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, function(match) {
      if (match.indexOf('<parameter name="attachments"') !== -1) return match;
      return match.replace(/<function_calls>\s*<invoke name="complete">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, '$1');
    });
    content = content.replace(/<function_calls>\s*<invoke name="present_presentation">[\s\S]*?<parameter name="text">([\s\S]*?)<\/parameter>[\s\S]*?<\/invoke>\s*<\/function_calls>/gi, '$1');
    return content;
  };

  MobileChatWidget.prototype.parseFunctionCalls = function(text) {
    var preprocessedText = this.preprocessTextOnlyTools(text || '');
    if (!this.isNewXmlFormat(preprocessedText)) {
      var clean = preprocessedText.replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, ' ').replace(/\s+/g, ' ').trim();
      return { text: clean, functionCalls: null };
    }
    var functionCallsRegex = /<function_calls>([\s\S]*?)<\/function_calls>/gi;
    var match;
    var lastIndex = 0;
    var textParts = [];
    var allFunctionCalls = [];
    while ((match = functionCallsRegex.exec(preprocessedText)) !== null) {
      if (match.index > lastIndex) {
        var textBefore = preprocessedText.substring(lastIndex, match.index).trim();
        if (textBefore) textParts.push(textBefore);
      }
      var toolCalls = this.parseXmlToolCalls(match[0]);
      for (var i = 0; i < toolCalls.length; i++) {
        var tc = toolCalls[i];
        var name = tc.functionName.replace(/_/g, '-');
        if (name !== 'ask' && name !== 'complete' && name !== 'present-presentation') {
          allFunctionCalls.push(tc);
        }
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < preprocessedText.length) {
      var remaining = preprocessedText.substring(lastIndex).trim();
      if (remaining) textParts.push(remaining);
    }
    var cleanText = textParts.join(' ').replace(/\s+/g, ' ').trim();
    return { text: cleanText, functionCalls: allFunctionCalls.length > 0 ? allFunctionCalls : null };
  };

  MobileChatWidget.prototype.getUserFriendlyToolName = function(toolName) {
    var toolNameMap = {
      'execute-command': 'Executing Command',
      'create-file': 'Creating File',
      'delete-file': 'Deleting File',
      'full-file-rewrite': 'Rewriting File',
      'str-replace': 'Editing Text',
      'edit-file': 'Editing File',
      'read-file': 'Reading File',
      'web-search': 'Searching Web',
      'web_search': 'Searching Web',
      'browser-navigate-to': 'Navigating to Page',
      'browser-act': 'Performing Action',
      'browser-extract-content': 'Extracting Content',
      'browser-screenshot': 'Taking Screenshot',
      'deploy-site': 'Deploying',
      'ask': 'Ask',
      'complete': 'Completing Task'
    };
    if (toolName.indexOf('mcp-') === 0) {
      var parts = toolName.split('-');
      if (parts.length >= 3) {
        var serverName = parts[1];
        var toolNamePart = parts.slice(2).join('-');
        var formattedServerName = serverName.charAt(0).toUpperCase() + serverName.slice(1);
        var formattedToolName = toolNamePart.split('-').map(function(word) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
        return formattedServerName + ': ' + formattedToolName;
      }
    }
    if (toolNameMap[toolName]) return toolNameMap[toolName];
    return toolName.split('-').map(function(word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  MobileChatWidget.prototype.extractPrimaryParam = function(toolCall) {
    var params = toolCall.parameters;
    if (params.file_path) return params.file_path;
    if (params.command) return params.command;
    if (params.query) return params.query;
    if (params.url) return params.url;
    if (params.target_file) return params.target_file;
    return null;
  };

  MobileChatWidget.prototype.getToolIcon = function(toolName) {
    var iconMap = {
      'execute-command': '\u26a1',
      'create-file': '\u1f4c4',
      'delete-file': '\u1f5d1',
      'edit-file': '\u270f\ufe0f',
      'read-file': '\u1f4d6',
      'web-search': '\u1f50d',
      'web_search': '\u1f50d',
      'browser-navigate-to': '\u1f310',
      'browser-act': '\u1f5b1\ufe0f',
      'browser-extract-content': '\u1f4cb',
      'browser-screenshot': '\u1f4f8',
      'deploy-site': '\u1f680'
    };
    if (toolName.indexOf('mcp-') === 0) return '\u1f50c';
    return iconMap[toolName] || '\u2699\ufe0f';
  };

  MobileChatWidget.prototype.createFunctionCallsElement = function(functionCalls) {
    var self = this;
    var container = document.createElement('div');
    container.className = 'mc-function-calls';
    var header = document.createElement('div');
    header.className = 'mc-function-calls-header';
    header.innerHTML = '<svg class="mc-function-calls-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg><span>' + functionCalls.length + ' tool call' + (functionCalls.length !== 1 ? 's' : '') + '</span>';
    var content = document.createElement('div');
    content.className = 'mc-function-calls-content';
    for (var i = 0; i < functionCalls.length; i++) {
      var toolCall = functionCalls[i];
      var toolName = toolCall.functionName;
      var friendlyName = this.getUserFriendlyToolName(toolName);
      var primaryParam = this.extractPrimaryParam(toolCall);
      var funcDiv = document.createElement('div');
      funcDiv.className = 'mc-function-call';
      var nameDiv = document.createElement('div');
      nameDiv.className = 'mc-function-name';
      nameDiv.innerHTML = '<span class="mc-function-icon">' + this.getToolIcon(toolName) + '</span>' + this.escapeHtml(friendlyName);
      if (primaryParam !== undefined && primaryParam !== null) {
        var paramDisplay = typeof primaryParam === 'string' && primaryParam.length > 50 ? primaryParam.substring(0, 47) + '...' : String(primaryParam);
        nameDiv.innerHTML += ' <span class="mc-function-param-preview">' + this.escapeHtml(paramDisplay) + '</span>';
      }
      var paramsDiv = document.createElement('div');
      paramsDiv.className = 'mc-function-params';
      var otherParams = [];
      var paramKeys = Object.keys(toolCall.parameters || {});
      for (var k = 0; k < paramKeys.length; k++) {
        var pname = paramKeys[k];
        if (primaryParam !== undefined && primaryParam !== null && (pname === 'file_path' || pname === 'command' || pname === 'query' || pname === 'url' || pname === 'target_file')) continue;
        otherParams.push([pname, toolCall.parameters[pname]]);
      }
      if (otherParams.length > 0) {
        for (var j = 0; j < otherParams.length; j++) {
          var paramDiv = document.createElement('div');
          paramDiv.className = 'mc-function-param';
          var displayValue = typeof otherParams[j][1] === 'object' ? JSON.stringify(otherParams[j][1], null, 2) : String(otherParams[j][1]);
          paramDiv.innerHTML = '<span class="mc-function-param-name">' + this.escapeHtml(otherParams[j][0]) + ':</span> <span class="mc-function-param-value">' + this.escapeHtml(displayValue) + '</span>';
          paramsDiv.appendChild(paramDiv);
        }
      }
      funcDiv.appendChild(nameDiv);
      if (otherParams.length > 0) funcDiv.appendChild(paramsDiv);
      content.appendChild(funcDiv);
    }
    var isCollapsed = false;
    header.addEventListener('click', function() {
      isCollapsed = !isCollapsed;
      var icon = header.querySelector('.mc-function-calls-icon');
      if (icon) {
        if (isCollapsed) {
          icon.classList.add('collapsed');
          content.classList.add('collapsed');
        } else {
          icon.classList.remove('collapsed');
          content.classList.remove('collapsed');
        }
      }
    });
    container.appendChild(header);
    container.appendChild(content);
    return container;
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
      if (this.debug && parsed.functionCalls && parsed.functionCalls.length) {
        bubble.appendChild(this.createFunctionCallsElement(parsed.functionCalls));
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
    if (this.debug && parsed.functionCalls && parsed.functionCalls.length) {
      bubble.appendChild(this.createFunctionCallsElement(parsed.functionCalls));
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
    if (this.debug && parsed.functionCalls && parsed.functionCalls.length) {
      bubble.appendChild(this.createFunctionCallsElement(parsed.functionCalls));
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
      var debugAttr = script.getAttribute('data-debug');
      var showDebugAttr = script.getAttribute('data-show-debug');
      var debug = (script.hasAttribute('data-debug') && debugAttr !== 'false') || showDebugAttr === 'true';
      new MobileChatWidget({
        apiKey: key,
        agentId: agentId,
        apiUrl: script.getAttribute('data-api-url'),
        title: script.getAttribute('data-title') || 'Chat',
        containerId: 'mobile-chat-' + agentId,
        debug: debug
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
