(function() {
  'use strict';

  // BaseAI Chat Widget — Telegram theme
  class BaseAIChatWidget {
    constructor(config) {
      this.apiKey = config.apiKey;
      this.agentId = config.agentId;
      this.apiUrl = config.apiUrl || window.location.origin.replace(':3000', ':8000');
      this.containerId = config.containerId || `baseai-widget-${config.agentId}`;
      this.title = config.title || 'AI Assistant';
      this.debug = config.debug || config.showDebug || false;
      this.threadId = null;
      this.isOpen = false;
      this.messages = [];
      this.agentData = null; // Store agent data for greeting message

      this.init();
    }

    async init() {
      this.createWidget();
      await this.loadAgentData();
      await this.loadThread();
    }

    createWidget() {
      let container = document.getElementById(this.containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = this.containerId;
        document.body.appendChild(container);
        if (this.debug) {
          console.log('BaseAI Widget: Auto-created container', this.containerId);
        }
      }

      // Create modern mobile-first widget styles with awesome design
      const styles = `
        * {
          box-sizing: border-box;
        }
        .baseai-widget-container {
          position: fixed;
          inset: 0;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          pointer-events: auto;
          /* iPhone: full viewport including safe areas */
          width: 100%;
          height: 100%;
          height: 100dvh;
          min-height: -webkit-fill-available;
        }
        .baseai-widget-container.closed {
          display: none;
        }
        .baseai-widget-chatbox {
          position: absolute;
          inset: 0;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          /* Always visible, full-screen (no button, no toggle) */
          transform: none;
          opacity: 1;
          width: 100%;
          height: 100%;
          height: 100dvh;
          min-height: -webkit-fill-available;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-chatbox {
            background: #17212b;
          }
        }
        .baseai-widget-header {
          background: #0088cc;
          color: white;
          padding: 16px 20px;
          padding-top: max(16px, env(safe-area-inset-top));
          padding-left: max(20px, env(safe-area-inset-left));
          padding-right: max(20px, env(safe-area-inset-right));
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          min-height: 56px;
          flex-shrink: 0;
          position: relative;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-header {
            background: #2b5278;
          }
        }
        .baseai-widget-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.02em;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .baseai-widget-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          cursor: pointer;
          padding: 10px;
          min-width: 44px;
          min-height: 44px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          -webkit-tap-highlight-color: transparent;
        }
        .baseai-widget-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }
        .baseai-widget-close svg {
          width: 20px;
          height: 20px;
          stroke: white;
          stroke-width: 2.5;
        }
        .baseai-widget-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px 12px;
          padding-left: max(12px, env(safe-area-inset-left));
          padding-right: max(12px, env(safe-area-inset-right));
          background: #e8e8e8;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          overscroll-behavior: contain;
        }
        @media (min-width: 768px) {
          .baseai-widget-messages {
            padding: 20px;
          }
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-messages {
            background: #17212b;
          }
        }
        .baseai-widget-messages::-webkit-scrollbar {
          width: 4px;
        }
        .baseai-widget-messages::-webkit-scrollbar-track {
          background: transparent;
        }
        .baseai-widget-messages::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .baseai-widget-messages::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .baseai-widget-message {
          margin-bottom: 8px;
          display: flex;
          flex-direction: column;
          animation: messageSlideIn 0.3s ease-out;
        }
        @media (min-width: 768px) {
          .baseai-widget-message {
            margin-bottom: 12px;
          }
        }
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .baseai-widget-message.user {
          align-items: flex-end;
        }
        .baseai-widget-message.assistant {
          align-items: flex-start;
        }
        .baseai-widget-message-bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 24px;
          word-wrap: break-word;
          line-height: 1.6;
          font-size: 15px;
          position: relative;
        }
        @media (min-width: 768px) {
          .baseai-widget-message-bubble {
            max-width: 75%;
            padding: 14px 20px;
          }
        }
        .baseai-widget-message.user .baseai-widget-message-bubble {
          background: #effdde;
          color: #1e293b;
          border-bottom-right-radius: 4px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-message.user .baseai-widget-message-bubble {
            background: #2b5278;
            color: #e4edfd;
          }
        }
        .baseai-widget-message.assistant .baseai-widget-message-bubble {
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-message.assistant .baseai-widget-message-bubble {
            background: #182533;
            color: #e4edfd;
            border-color: #2b5278;
          }
        }
        .baseai-widget-function-calls {
          margin-top: 12px;
          padding: 12px;
          background: #f1f5f9;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-function-calls {
            background: #182533;
            border-color: #2b5278;
          }
        }
        .baseai-widget-function-calls-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          user-select: none;
        }
        .baseai-widget-function-calls-header:hover {
          color: #0088cc;
        }
        .baseai-widget-function-calls-icon {
          width: 16px;
          height: 16px;
          transition: transform 0.2s;
        }
        .baseai-widget-function-calls-icon.collapsed {
          transform: rotate(-90deg);
        }
        .baseai-widget-function-calls-content {
          display: block;
        }
        .baseai-widget-function-calls-content.collapsed {
          display: none;
        }
        .baseai-widget-function-call {
          margin-bottom: 10px;
          padding: 10px;
          background: white;
          border-radius: 8px;
          border-left: 3px solid #0088cc;
        }
        .baseai-widget-function-call:last-child {
          margin-bottom: 0;
        }
        .baseai-widget-function-name {
          font-weight: 600;
          color: #0088cc;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .baseai-widget-function-name::before {
          content: '⚙️';
          font-size: 14px;
        }
        .baseai-widget-function-params {
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid #e2e8f0;
        }
        .baseai-widget-function-param {
          margin-bottom: 4px;
          font-size: 12px;
          color: #64748b;
        }
        .baseai-widget-function-param-name {
          font-weight: 500;
          color: #475569;
        }
        .baseai-widget-function-param-value {
          margin-left: 8px;
          color: #1e293b;
        }
        /* Markdown styles */
        .baseai-widget-markdown-p {
          margin: 0 0 8px 0;
          line-height: 1.6;
        }
        .baseai-widget-markdown-p:last-child {
          margin-bottom: 0;
        }
        .baseai-widget-markdown-h1 {
          font-size: 18px;
          font-weight: 600;
          margin: 12px 0 8px 0;
          line-height: 1.4;
        }
        .baseai-widget-markdown-h2 {
          font-size: 16px;
          font-weight: 600;
          margin: 10px 0 6px 0;
          line-height: 1.4;
        }
        .baseai-widget-markdown-h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 8px 0 4px 0;
          line-height: 1.4;
        }
        .baseai-widget-markdown-strong {
          font-weight: 600;
        }
        .baseai-widget-markdown-em {
          font-style: italic;
        }
        .baseai-widget-markdown-ul,
        .baseai-widget-markdown-ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        .baseai-widget-markdown-ul {
          list-style-type: disc;
        }
        .baseai-widget-markdown-ol {
          list-style-type: decimal;
        }
        .baseai-widget-markdown-li {
          margin: 4px 0;
          line-height: 1.5;
        }
        .baseai-widget-message.user .baseai-widget-markdown-link {
          color: #0088cc;
          text-decoration: underline;
          cursor: pointer;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-message.user .baseai-widget-markdown-link {
            color: #8fc5f7;
          }
        }
        .baseai-widget-message.assistant .baseai-widget-markdown-link {
          color: #0088cc;
          text-decoration: underline;
          cursor: pointer;
        }
        .baseai-widget-message.assistant .baseai-widget-markdown-link:hover {
          color: #006699;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-message.assistant .baseai-widget-markdown-link {
            color: #6ab3f3;
          }
          .baseai-widget-message.assistant .baseai-widget-markdown-link:hover {
            color: #8fc5f7;
          }
        }
        .baseai-widget-message.user .baseai-widget-markdown-code {
          background: rgba(0, 136, 204, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          color: #1e293b;
        }
        .baseai-widget-message.assistant .baseai-widget-markdown-code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          color: #e11d48;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-message.assistant .baseai-widget-markdown-code {
            background: #243447;
            color: #fca5a5;
          }
        }
        .baseai-widget-message.user .baseai-widget-markdown-pre {
          background: rgba(0, 136, 204, 0.12);
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 8px 0;
          border: 1px solid rgba(0, 136, 204, 0.25);
        }
        .baseai-widget-message.user .baseai-widget-markdown-pre .baseai-widget-markdown-code {
          background: transparent;
          padding: 0;
          color: #1e293b;
          font-size: 12px;
          line-height: 1.5;
        }
        .baseai-widget-message.assistant .baseai-widget-markdown-pre {
          background: #f1f5f9;
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 8px 0;
          border: 1px solid #e2e8f0;
        }
        .baseai-widget-message.assistant .baseai-widget-markdown-pre .baseai-widget-markdown-code {
          background: transparent;
          padding: 0;
          color: #1e293b;
          font-size: 12px;
          line-height: 1.5;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-message.assistant .baseai-widget-markdown-pre {
            background: #243447;
            border-color: #2b5278;
          }
          .baseai-widget-message.assistant .baseai-widget-markdown-pre .baseai-widget-markdown-code {
            color: #e4edfd;
          }
        }
        .baseai-widget-message.user .baseai-widget-markdown-inline-code {
          background: rgba(0, 136, 204, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          color: #1e293b;
        }
        .baseai-widget-message.assistant .baseai-widget-markdown-inline-code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          color: #e11d48;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-message.assistant .baseai-widget-markdown-inline-code {
            background: #243447;
            color: #fca5a5;
          }
        }
        .baseai-widget-markdown-img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 8px 0;
        }
        .baseai-widget-markdown-hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 12px 0;
        }
        .baseai-widget-markdown-blockquote {
          border-left: 3px solid #cbd5e1;
          padding-left: 12px;
          margin: 8px 0;
          color: #64748b;
          font-style: italic;
        }
        .baseai-widget-input-container {
          padding: 12px 16px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
          padding-left: max(16px, env(safe-area-inset-left));
          padding-right: max(16px, env(safe-area-inset-right));
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          gap: 8px;
          align-items: center;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
          flex-shrink: 0;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-input-container {
            background: #17212b;
            border-top-color: #2b5278;
          }
        }
        .baseai-widget-input {
          flex: 1;
          border: 2px solid #e2e8f0;
          border-radius: 24px;
          padding: 12px 20px;
          font-size: 16px;
          outline: none;
          transition: all 0.2s;
          background: #f8fafc;
          color: #1e293b;
          -webkit-appearance: none;
          min-height: 44px;
        }
        .baseai-widget-input:focus {
          border-color: #0088cc;
          background: white;
          box-shadow: 0 0 0 3px rgba(0, 136, 204, 0.1);
        }
        .baseai-widget-input::placeholder {
          color: #94a3b8;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-input {
            background: #17212b;
            border-color: #2b5278;
            color: #e4edfd;
          }
          .baseai-widget-input:focus {
            background: #182533;
            border-color: #2b5278;
            box-shadow: 0 0 0 3px rgba(43, 82, 120, 0.2);
          }
        }
        .baseai-widget-send {
          width: 44px;
          height: 44px;
          min-width: 44px;
          min-height: 44px;
          border-radius: 50%;
          background: #0088cc;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0, 136, 204, 0.3);
          -webkit-tap-highlight-color: transparent;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-send {
            background: #2b5278;
          }
        }
        .baseai-widget-send:hover:not(:disabled) {
          transform: scale(1.05);
          background: #006699;
          box-shadow: 0 4px 12px rgba(0, 136, 204, 0.4);
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-send:hover:not(:disabled) {
            background: #006699;
          }
        }
        .baseai-widget-send:active:not(:disabled) {
          transform: scale(0.95);
        }
        .baseai-widget-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .baseai-widget-send svg {
          width: 20px;
          height: 20px;
          stroke: white;
          stroke-width: 2;
          fill: none;
        }
        .baseai-widget-loading {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          border-bottom-left-radius: 4px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        @media (min-width: 768px) {
          .baseai-widget-loading {
            padding: 14px 20px;
          }
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-loading {
            background: #182533;
            border-color: #2b5278;
          }
        }
        .baseai-widget-loading::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 136, 204, 0.15), transparent);
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        .baseai-widget-loading-dots {
          display: inline-flex;
          gap: 4px;
          align-items: center;
        }
        .baseai-widget-loading span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #0088cc;
          animation: typing 1.4s infinite ease-in-out both;
          box-shadow: 0 0 8px rgba(0, 136, 204, 0.4);
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-loading span {
            background: #2b5278;
            box-shadow: 0 0 8px rgba(43, 82, 120, 0.4);
          }
        }
        .baseai-widget-loading span:nth-child(1) { 
          animation-delay: 0s;
        }
        .baseai-widget-loading span:nth-child(2) { 
          animation-delay: 0.2s;
        }
        .baseai-widget-loading span:nth-child(3) { 
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0%, 60%, 100% { 
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          30% { 
            transform: translateY(-10px) scale(1.1);
            opacity: 1;
          }
        }
        .baseai-widget-powered {
          padding: 10px 16px;
          padding-bottom: max(10px, env(safe-area-inset-bottom));
          text-align: center;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex-shrink: 0;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-powered {
            background: #17212b;
            border-top-color: #2b5278;
          }
        }
        .baseai-widget-powered a {
          color: #0088cc;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        @media (prefers-color-scheme: dark) {
          .baseai-widget-powered a {
            color: #2b5278;
          }
        }
        .baseai-widget-powered a:hover {
          color: #006699;
        }
        /* Keep full-screen on all viewports (no floating window) */
        @media (min-width: 768px) {
          .baseai-widget-message-bubble {
            max-width: 75%;
          }
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);

      // Create full-screen widget HTML (no floating button)
      container.innerHTML = `
        <div class="baseai-widget-container">
          <div class="baseai-widget-chatbox open" id="${this.containerId}-chatbox">
            <div class="baseai-widget-header">
              <h3>${this.title}</h3>
              <button class="baseai-widget-close" id="${this.containerId}-close" aria-label="Close chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="baseai-widget-messages" id="${this.containerId}-messages"></div>
            <div class="baseai-widget-input-container">
              <input 
                type="text" 
                class="baseai-widget-input" 
                id="${this.containerId}-input" 
                placeholder="Type your message..."
                autocomplete="off"
                aria-label="Message input"
                inputmode="text"
              />
              <button class="baseai-widget-send" id="${this.containerId}-send" type="submit" aria-label="Send message">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
            <div class="baseai-widget-powered">
              <span>Powered by</span>
              <a href="https://a2abase.ai" target="_blank" rel="noopener noreferrer">A2ABase</a>
            </div>
          </div>
        </div>
      `;

      this.isOpen = true;

      // Attach event listeners
      const closeBtn = document.getElementById(`${this.containerId}-close`);
      const sendBtn = document.getElementById(`${this.containerId}-send`);
      const input = document.getElementById(`${this.containerId}-input`);

      closeBtn.addEventListener('click', () => this.toggleChat());
      sendBtn.addEventListener('click', () => this.sendMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    }

    toggleChat() {
      this.isOpen = !this.isOpen;
      const container = document.querySelector(`#${this.containerId} .baseai-widget-container`);
      if (container) {
        if (this.isOpen) {
          container.classList.remove('closed');
          const input = document.getElementById(`${this.containerId}-input`);
          if (input) input.focus();
        } else {
          container.classList.add('closed');
        }
      }
    }

    async loadAgentData() {
      if (!this.agentId) return;
      
      try {
        const response = await fetch(`${this.apiUrl}/agents/${this.agentId}`, {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
          },
        });

        if (response.ok) {
          const data = await response.json();
          this.agentData = data;
          if (this.debug) {
            console.log('BaseAI Widget: Loaded agent data', data);
          }
        }
      } catch (error) {
        if (this.debug) {
          console.error('BaseAI Widget: Failed to load agent data', error);
        }
      }
    }

    async loadThread() {
      try {
        // Always create a new thread (no history persistence)
        const formData = new FormData();

        if (this.debug) {
          console.log('BaseAI Widget: Sending request with API key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'MISSING');
        }

        const response = await fetch(`${this.apiUrl}/threads`, {
          method: 'POST',
          headers: {
            'X-API-Key': this.apiKey,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create thread: ${errorText}`);
        }

        const data = await response.json();
        this.threadId = data.thread_id;

        if (this.agentData?.greeting_message) {
          this.showGreetingMessage();
        }
      } catch (error) {
        if (this.debug) {
          console.error('BaseAI Widget: Failed to load thread', error);
        }
        this.addMessage('assistant', 'Sorry, I couldn\'t connect. Please check your API key.');
      }
    }

    showGreetingMessage() {
      if (!this.agentData?.greeting_message || !this.agentData.greeting_message.trim()) {
        return;
      }

      const messagesContainer = document.getElementById(`${this.containerId}-messages`);
      if (!messagesContainer) return;

      // Check if greeting message already exists
      const existingGreeting = messagesContainer.querySelector('.baseai-widget-greeting-message');
      if (existingGreeting) return;

      // Check if there are any messages - don't show greeting if messages exist
      if (this.messages.length > 0) {
        // Remove header if it exists and messages are present
        const existingHeader = messagesContainer.querySelector('.baseai-widget-greeting-header');
        if (existingHeader) {
          existingHeader.remove();
        }
        return;
      }

      // Check if header already exists
      let headerDiv = messagesContainer.querySelector('.baseai-widget-greeting-header');
      if (!headerDiv) {
        // Create "Start a conversation" header
        headerDiv = document.createElement('div');
        headerDiv.className = 'baseai-widget-greeting-header';
        headerDiv.style.cssText = 'text-align: center; margin-bottom: 1.5rem; padding: 0 1rem;';
        
        const headerText = document.createElement('h2');
        headerText.textContent = 'Start a conversation';
        // Add dark mode support
        const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        headerText.style.cssText = `font-size: 1.5rem; font-weight: 700; color: ${isDarkMode ? '#e4edfd' : '#111827'}; margin: 0; line-height: 1.2;`;
        headerDiv.appendChild(headerText);
        messagesContainer.insertBefore(headerDiv, messagesContainer.firstChild);
      }

      // Create greeting message element
      const greetingDiv = document.createElement('div');
      greetingDiv.className = 'baseai-widget-message assistant baseai-widget-greeting-message';
      
      const bubble = document.createElement('div');
      bubble.className = 'baseai-widget-message-bubble';
      // Use gradient background with dark mode support (Telegram theme)
      if (isDarkMode) {
        bubble.style.cssText = 'background: linear-gradient(to bottom right, rgba(0, 136, 204, 0.25), rgba(24, 37, 51, 1)); border: 2px solid rgba(43, 82, 120, 0.4); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); padding: 1rem 1.25rem;';
      } else {
        bubble.style.cssText = 'background: linear-gradient(to bottom right, rgba(0, 136, 204, 0.08), rgba(255, 255, 255, 1)); border: 2px solid rgba(0, 136, 204, 0.2); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 1rem 1.25rem;';
      }
      
      const markdownHtml = this.renderMarkdown(this.agentData.greeting_message);
      const textContainer = document.createElement('div');
      textContainer.className = 'baseai-widget-markdown-content';
      textContainer.innerHTML = markdownHtml;
      bubble.appendChild(textContainer);
      
      greetingDiv.appendChild(bubble);
      messagesContainer.appendChild(greetingDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendMessage() {
      const input = document.getElementById(`${this.containerId}-input`);
      if (!input) return;

      const message = input.value.trim();
      if (!message || !this.threadId) return;

      input.value = '';
      input.disabled = true;
      const sendBtn = document.getElementById(`${this.containerId}-send`);
      if (sendBtn) sendBtn.disabled = true;

      this.addMessage('user', message);

      // Show loading indicator
      const loadingId = this.addLoadingMessage();

      // Declare variables outside try block so they're accessible in catch block
      let assistantMessageId = null;
      let fullText = '';
      let streamClosed = false;
      let loadingRemoved = false;

      try {
        // First, add the user message to the thread
        await fetch(`${this.apiUrl}/threads/${this.threadId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
          body: JSON.stringify({
            type: 'user',
            content: message,
            is_llm_message: true,
          }),
        });

        // Start the agent (matching frontend's startAgent call)
        const startResponse = await fetch(`${this.apiUrl}/thread/${this.threadId}/agent/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey,
          },
          body: JSON.stringify({
            stream: true,
            agent_id: this.agentId,
          }),
        });

        if (!startResponse.ok) {
          const errorText = await startResponse.text();
          throw new Error(`Failed to start agent: ${errorText}`);
        }

        const startData = await startResponse.json();
        const agentRunId = startData.agent_run_id;

        if (!agentRunId) {
          throw new Error('No agent run ID received');
        }

        // Don't remove loading indicator yet - wait for first content
        // Stream the agent response using EventSource (same as frontend)
        // Note: EventSource doesn't support custom headers, so we need to pass API key as query param
        // But since the backend expects X-API-Key header, we'll use fetch with ReadableStream
        // However, we'll handle it the same way as EventSource would

        // Helper function to safely parse JSON
        const safeJsonParse = (str, defaultValue) => {
          try {
            return JSON.parse(str);
          } catch (e) {
            return defaultValue;
          }
        };

        // Handle stream message (following useAgentStream pattern)
        const handleStreamMessage = (rawData) => {
          if (streamClosed) return;

          let processedData = rawData;
          if (processedData.startsWith('data: ')) {
            processedData = processedData.substring(6).trim();
          }
          if (!processedData) return;

          // Debug: log first few messages to understand the format
          if (this.debug) {
            console.log('Widget: Received stream data:', processedData.substring(0, 200));
          }

          // Check for completion status messages first
          if (processedData === '{"type": "status", "status": "completed", "message": "Agent run completed successfully"}') {
            streamClosed = true;
            return;
          }
          if (processedData.includes('Run data not available for streaming') || 
              processedData.includes('Stream ended with status: completed')) {
            streamClosed = true;
            return;
          }

          // Check for completion/error status messages in JSON format
          try {
            const jsonData = JSON.parse(processedData);
            if (jsonData.type === 'status' && jsonData.status) {
              if (jsonData.status === 'completed' || jsonData.status === 'stopped' || jsonData.status === 'failed') {
                streamClosed = true;
                return;
              }
              if (jsonData.status === 'error') {
                throw new Error(jsonData.message || 'Unknown error occurred');
              }
            }
          } catch (jsonError) {
            // Not JSON or could not parse as JSON, continue processing
          }

          // Parse the message (following UnifiedMessage structure)
          const message = safeJsonParse(processedData, null);
          if (!message) {
            if (this.debug) {
              console.warn('Widget: Failed to parse streamed message:', processedData);
            }
            return;
          }

          // Check for completion status at top level
          if (message.type === 'status' && message.status) {
            if (message.status === 'completed' || message.status === 'stopped' || message.status === 'failed') {
              streamClosed = true;
              return;
            }
            if (message.status === 'error') {
              throw new Error(message.message || 'Unknown error occurred');
            }
            return;
          }

          // Parse content and metadata (they are JSON strings)
          const parsedContent = safeJsonParse(message.content, {});
          const parsedMetadata = safeJsonParse(message.metadata, {});

          // Handle assistant messages (following useAgentStream pattern)
          if (message.type === 'assistant') {
            if (parsedMetadata.stream_status === 'chunk' && parsedContent.content) {
              // First chunk - remove loading and create assistant message
              if (!loadingRemoved) {
                this.removeMessage(loadingId);
                loadingRemoved = true;
                assistantMessageId = this.addMessage('assistant', '');
              }
              // Streaming chunk - append to fullText (function calls are part of the content)
              fullText += parsedContent.content;
              this.updateMessage(assistantMessageId, fullText);
            } else if (parsedMetadata.stream_status === 'complete') {
              // Message chunk complete - but stream continues, don't close!
              // Just ensure loading is removed
              if (!loadingRemoved) {
                this.removeMessage(loadingId);
                loadingRemoved = true;
                if (!assistantMessageId) {
                  assistantMessageId = this.addMessage('assistant', fullText || '');
                }
              }
              // Continue streaming - don't set streamClosed = true here
            } else if (!parsedMetadata.stream_status && parsedContent.content) {
              // Non-chunked assistant message (only add if we haven't already processed chunks)
              if (!loadingRemoved) {
                this.removeMessage(loadingId);
                loadingRemoved = true;
                assistantMessageId = this.addMessage('assistant', '');
              }
              if (fullText === '') {
                fullText += parsedContent.content;
                this.updateMessage(assistantMessageId, fullText);
              } else {
                // Append to existing content
                fullText += parsedContent.content;
                this.updateMessage(assistantMessageId, fullText);
              }
            }
          } else if (message.type === 'status') {
            // Handle status messages - only close stream on actual completion status
            if (parsedContent.status && ['completed', 'stopped', 'failed'].includes(parsedContent.status)) {
              if (parsedContent.status === 'failed' || parsedContent.status === 'error') {
                throw new Error(parsedContent.message || 'Agent run failed');
              }
              // Only close stream on actual completion
              streamClosed = true;
            }
          } else if (message.type === 'tool') {
            // Tool results - continue streaming, don't close
            // The stream continues after tool execution
          }
        };

        // Use fetch with ReadableStream
        // Note: The backend stream endpoint accepts token as query param OR X-API-Key header
        // Since we're using API keys, we'll use the header approach
        const streamResponse = await fetch(`${this.apiUrl}/agent-run/${agentRunId}/stream`, {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey,
          },
        });

        if (!streamResponse.ok) {
          throw new Error(`Failed to stream agent response: ${streamResponse.statusText}`);
        }

        // Read the stream efficiently (SSE format) - optimized for speed
        const reader = streamResponse.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Process any remaining buffer
              if (buffer.trim()) {
                const lines = buffer.split('\n');
                for (const line of lines) {
                  if (line.trim() && line.startsWith('data: ')) {
                    try {
                      handleStreamMessage(line);
                    } catch (e) {
                      if (e.message && (e.message.includes('Agent run failed') || e.message.includes('error'))) {
                        throw e;
                      }
                      if (this.debug) {
                        console.warn('Widget: Error processing stream message:', e, line);
                      }
                    }
                  }
                }
              }
              break;
            }

            // Decode and process immediately
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            // Process all complete lines immediately
            for (const line of lines) {
              if (line.trim() === '') continue;
              if (line.startsWith('data: ')) {
                try {
                  handleStreamMessage(line);
                  if (streamClosed) break;
                } catch (e) {
                  // If it's an error we threw, rethrow it
                  if (e.message && (e.message.includes('Agent run failed') || e.message.includes('error'))) {
                    throw e;
                  }
                  // Otherwise, log and continue
                  if (this.debug) {
                    console.warn('Widget: Error processing stream message:', e, line);
                  }
                }
              }
            }

            if (streamClosed) break;
          }
        } finally {
          reader.releaseLock();
        }

        // If we never received content, remove loading and show error
        if (!loadingRemoved) {
          this.removeMessage(loadingId);
          if (!fullText.trim() && !streamClosed) {
            this.addMessage('assistant', 'No response received. Please try again.');
          } else if (assistantMessageId) {
            this.updateMessage(assistantMessageId, fullText || 'No response received. Please try again.');
          }
        } else if (!fullText.trim() && !streamClosed && assistantMessageId) {
          this.updateMessage(assistantMessageId, 'No response received. Please try again.');
        }
      } catch (error) {
        if (this.debug) {
          console.error('BaseAI Widget: Failed to send message', error);
        }
        if (!loadingRemoved) {
          this.removeMessage(loadingId);
        }
        const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
        // this.addMessage('assistant', 'Sorry, I encountered an error: ' + errorMessage + '. Please check your API key and try again.');
      } finally {
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
      }
    }

    // Check if content uses new XML format
    isNewXmlFormat(content) {
      return /<function_calls>[\s\S]*<invoke\s+name=/.test(content);
    }

    // Parse parameter value (handles JSON, booleans, numbers)
    parseParameterValue(value) {
      const trimmed = value.trim();
      
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return JSON.parse(trimmed);
        } catch {
          // Not valid JSON, return as string
        }
      }
      
      if (trimmed.toLowerCase() === 'true') return true;
      if (trimmed.toLowerCase() === 'false') return false;
      
      if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) return num;
      }
      
      return value;
    }

    // Parse XML tool calls (matching ThreadContent logic)
    parseXmlToolCalls(content) {
      const toolCalls = [];
      const functionCallsRegex = /<function_calls>([\s\S]*?)<\/function_calls>/gi;
      let functionCallsMatch;
      
      while ((functionCallsMatch = functionCallsRegex.exec(content)) !== null) {
        const functionCallsContent = functionCallsMatch[1];
        
        const invokeRegex = /<invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/invoke>/gi;
        let invokeMatch;
        
        while ((invokeMatch = invokeRegex.exec(functionCallsContent)) !== null) {
          const functionName = invokeMatch[1].replace(/_/g, '-');
          const invokeContent = invokeMatch[2];
          const parameters = {};
          
          const paramRegex = /<parameter\s+name=["']([^"']+)["']>([\s\S]*?)<\/parameter>/gi;
          let paramMatch;
          
          while ((paramMatch = paramRegex.exec(invokeContent)) !== null) {
            const paramName = paramMatch[1];
            const paramValue = paramMatch[2].trim();
            parameters[paramName] = this.parseParameterValue(paramValue);
          }
          
          toolCalls.push({
            functionName,
            parameters,
            rawXml: invokeMatch[0]
          });
        }
      }
      
      return toolCalls;
    }

    // Preprocess text-only tools (like ask/complete) - matching ThreadContent logic
    preprocessTextOnlyTools(content) {
      if (!content || typeof content !== 'string') {
        return content || '';
      }

      // Handle new function calls format - only strip if no attachments
      content = content.replace(/<function_calls>\s*<invoke name="ask">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, (match) => {
        if (match.includes('<parameter name="attachments"')) return match;
        return match.replace(/<function_calls>\s*<invoke name="ask">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, '$1');
      });

      content = content.replace(/<function_calls>\s*<invoke name="complete">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, (match) => {
        if (match.includes('<parameter name="attachments"')) return match;
        return match.replace(/<function_calls>\s*<invoke name="complete">\s*<parameter name="text">([\s\S]*?)<\/parameter>\s*<\/invoke>\s*<\/function_calls>/gi, '$1');
      });

      content = content.replace(/<function_calls>\s*<invoke name="present_presentation">[\s\S]*?<parameter name="text">([\s\S]*?)<\/parameter>[\s\S]*?<\/invoke>\s*<\/function_calls>/gi, '$1');

      return content;
    }

    // Get user-friendly tool name
    getUserFriendlyToolName(toolName) {
      const toolNameMap = {
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
        'complete': 'Completing Task',
      };

      // Check for MCP tools (mcp_serverName_toolName)
      if (toolName.startsWith('mcp-')) {
        const parts = toolName.split('-');
        if (parts.length >= 3) {
          const serverName = parts[1];
          const toolNamePart = parts.slice(2).join('-');
          const formattedServerName = serverName.charAt(0).toUpperCase() + serverName.slice(1);
          const formattedToolName = toolNamePart
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          return `${formattedServerName}: ${formattedToolName}`;
        }
      }

      // Check direct mapping
      if (toolNameMap[toolName]) {
        return toolNameMap[toolName];
      }

      // Format tool name (capitalize words)
      return toolName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    // Extract primary parameter for display
    extractPrimaryParam(toolCall) {
      const params = toolCall.parameters;
      if (params.file_path) return params.file_path;
      if (params.command) return params.command;
      if (params.query) return params.query;
      if (params.url) return params.url;
      if (params.target_file) return params.target_file;
      return null;
    }

    parseFunctionCalls(text) {
      // Preprocess to handle text-only tools first
      const preprocessedText = this.preprocessTextOnlyTools(text);
      
      // Check if it's new XML format
      if (!this.isNewXmlFormat(preprocessedText)) {
        return { text: preprocessedText, functionCalls: null };
      }

      // Find all function_calls blocks
      const functionCallsRegex = /<function_calls>([\s\S]*?)<\/function_calls>/gi;
      let match;
      let lastIndex = 0;
      const textParts = [];
      const allFunctionCalls = [];
      
      while ((match = functionCallsRegex.exec(preprocessedText)) !== null) {
        // Add text before the function_calls block
        if (match.index > lastIndex) {
          const textBefore = preprocessedText.substring(lastIndex, match.index);
          if (textBefore.trim()) {
            textParts.push(textBefore);
          }
        }
        
        // Parse tool calls in this block
        const toolCalls = this.parseXmlToolCalls(match[0]);
        
        // Filter out ask/complete tools (they're handled as text)
        const filteredToolCalls = toolCalls.filter(tc => {
          const toolName = tc.functionName.replace(/_/g, '-');
          return toolName !== 'ask' && toolName !== 'complete' && toolName !== 'present-presentation';
        });
        
        allFunctionCalls.push(...filteredToolCalls);
        lastIndex = match.index + match[0].length;
      }
      
      // Add any remaining text
      if (lastIndex < preprocessedText.length) {
        const remainingText = preprocessedText.substring(lastIndex);
        if (remainingText.trim()) {
          textParts.push(remainingText);
        }
      }
      
      const cleanText = textParts.join(' ').trim();
      return { 
        text: cleanText, 
        functionCalls: allFunctionCalls.length > 0 ? allFunctionCalls : null 
      };
    }

    // Get tool icon emoji/character
    getToolIcon(toolName) {
      const iconMap = {
        'execute-command': '⚡',
        'create-file': '📄',
        'delete-file': '🗑️',
        'edit-file': '✏️',
        'read-file': '📖',
        'web-search': '🔍',
        'web_search': '🔍',
        'browser-navigate-to': '🌐',
        'browser-act': '🖱️',
        'browser-extract-content': '📋',
        'browser-screenshot': '📸',
        'deploy-site': '🚀',
      };
      
      // Check for MCP tools
      if (toolName.startsWith('mcp-')) {
        return '🔌';
      }
      
      return iconMap[toolName] || '⚙️';
    }

    createFunctionCallsElement(functionCalls) {
      const container = document.createElement('div');
      container.className = 'baseai-widget-function-calls';
      
      const header = document.createElement('div');
      header.className = 'baseai-widget-function-calls-header';
      header.innerHTML = `
        <svg class="baseai-widget-function-calls-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span>${functionCalls.length} tool call${functionCalls.length !== 1 ? 's' : ''}</span>
      `;
      
      const content = document.createElement('div');
      content.className = 'baseai-widget-function-calls-content';
      
      functionCalls.forEach((toolCall) => {
        const toolName = toolCall.functionName;
        const friendlyName = this.getUserFriendlyToolName(toolName);
        const primaryParam = this.extractPrimaryParam(toolCall);
        
        const funcDiv = document.createElement('div');
        funcDiv.className = 'baseai-widget-function-call';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'baseai-widget-function-name';
        nameDiv.innerHTML = `<span style="margin-right: 6px;">${this.getToolIcon(toolName)}</span>${this.escapeHtml(friendlyName)}`;
        
        // Show primary parameter if available
        if (primaryParam) {
          const paramDisplay = typeof primaryParam === 'string' && primaryParam.length > 50 
            ? primaryParam.substring(0, 47) + '...' 
            : String(primaryParam);
          nameDiv.innerHTML += ` <span style="color: #64748b; font-weight: normal; margin-left: 8px;">${this.escapeHtml(paramDisplay)}</span>`;
        }
        
        const paramsDiv = document.createElement('div');
        paramsDiv.className = 'baseai-widget-function-params';
        
        // Only show other parameters if we have more than just the primary one
        const otherParams = Object.entries(toolCall.parameters).filter(([name]) => {
          if (primaryParam && (name === 'file_path' || name === 'command' || name === 'query' || name === 'url' || name === 'target_file')) {
            return false; // Already shown as primary
          }
          return true;
        });
        
        if (otherParams.length > 0) {
          otherParams.forEach(([paramName, paramValue]) => {
            const paramDiv = document.createElement('div');
            paramDiv.className = 'baseai-widget-function-param';
            const displayValue = typeof paramValue === 'object' 
              ? JSON.stringify(paramValue, null, 2)
              : String(paramValue);
            paramDiv.innerHTML = `
              <span class="baseai-widget-function-param-name">${this.escapeHtml(paramName)}:</span>
              <span class="baseai-widget-function-param-value">${this.escapeHtml(displayValue)}</span>
            `;
            paramsDiv.appendChild(paramDiv);
          });
        }
        
        funcDiv.appendChild(nameDiv);
        if (otherParams.length > 0) {
          funcDiv.appendChild(paramsDiv);
        }
        content.appendChild(funcDiv);
      });
      
      // Toggle collapse/expand
      let isCollapsed = false;
      header.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        const icon = header.querySelector('.baseai-widget-function-calls-icon');
        if (isCollapsed) {
          icon.classList.add('collapsed');
          content.classList.add('collapsed');
        } else {
          icon.classList.remove('collapsed');
          content.classList.remove('collapsed');
        }
      });
      
      container.appendChild(header);
      container.appendChild(content);
      
      return container;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Simple markdown to HTML converter
    renderMarkdown(text) {
      if (!text || typeof text !== 'string') {
        return '';
      }

      // Split into lines for processing
      const lines = text.split('\n');
      const processedLines = [];
      let inCodeBlock = false;
      let codeBlockContent = [];
      let inList = false;
      let listItems = [];
      let listType = null; // 'ul' or 'ol'

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Handle code blocks
        if (trimmed.startsWith('```')) {
          if (inCodeBlock) {
            // End code block
            const code = codeBlockContent.join('\n');
            processedLines.push(`<pre class="baseai-widget-markdown-pre"><code class="baseai-widget-markdown-code">${this.escapeHtml(code)}</code></pre>`);
            codeBlockContent = [];
            inCodeBlock = false;
          } else {
            // Start code block
            inCodeBlock = true;
            // Close any open list
            if (inList) {
              processedLines.push(`<${listType} class="baseai-widget-markdown-${listType}">${listItems.join('')}</${listType}>`);
              listItems = [];
              inList = false;
              listType = null;
            }
          }
          continue;
        }

        if (inCodeBlock) {
          codeBlockContent.push(line);
          continue;
        }

        // Handle headers
        if (trimmed.startsWith('### ')) {
          if (inList) {
            processedLines.push(`<${listType} class="baseai-widget-markdown-${listType}">${listItems.join('')}</${listType}>`);
            listItems = [];
            inList = false;
            listType = null;
          }
          processedLines.push(`<h3 class="baseai-widget-markdown-h3">${this.processInlineMarkdown(trimmed.substring(4))}</h3>`);
          continue;
        }
        if (trimmed.startsWith('## ')) {
          if (inList) {
            processedLines.push(`<${listType} class="baseai-widget-markdown-${listType}">${listItems.join('')}</${listType}>`);
            listItems = [];
            inList = false;
            listType = null;
          }
          processedLines.push(`<h2 class="baseai-widget-markdown-h2">${this.processInlineMarkdown(trimmed.substring(3))}</h2>`);
          continue;
        }
        if (trimmed.startsWith('# ')) {
          if (inList) {
            processedLines.push(`<${listType} class="baseai-widget-markdown-${listType}">${listItems.join('')}</${listType}>`);
            listItems = [];
            inList = false;
            listType = null;
          }
          processedLines.push(`<h1 class="baseai-widget-markdown-h1">${this.processInlineMarkdown(trimmed.substring(2))}</h1>`);
          continue;
        }

        // Handle horizontal rules
        if (trimmed === '---' || trimmed === '***') {
          if (inList) {
            processedLines.push(`<${listType} class="baseai-widget-markdown-${listType}">${listItems.join('')}</${listType}>`);
            listItems = [];
            inList = false;
            listType = null;
          }
          processedLines.push('<hr class="baseai-widget-markdown-hr" />');
          continue;
        }

        // Handle lists
        const ulMatch = trimmed.match(/^[\*\-\+] (.+)$/);
        const olMatch = trimmed.match(/^\d+\. (.+)$/);
        
        if (ulMatch || olMatch) {
          const currentListType = ulMatch ? 'ul' : 'ol';
          const itemText = ulMatch ? ulMatch[1] : olMatch[1];
          
          if (inList && listType !== currentListType) {
            // Different list type, close previous list
            processedLines.push(`<${listType} class="baseai-widget-markdown-${listType}">${listItems.join('')}</${listType}>`);
            listItems = [];
            listType = currentListType;
          } else if (!inList) {
            listType = currentListType;
            inList = true;
          }
          
          listItems.push(`<li class="baseai-widget-markdown-li">${this.processInlineMarkdown(itemText)}</li>`);
          continue;
        }

        // If we hit a non-list line and we're in a list, close it
        if (inList && trimmed !== '') {
          processedLines.push(`<${listType} class="baseai-widget-markdown-${listType}">${listItems.join('')}</${listType}>`);
          listItems = [];
          inList = false;
          listType = null;
        }

        // Handle blockquotes
        if (trimmed.startsWith('> ')) {
          processedLines.push(`<blockquote class="baseai-widget-markdown-blockquote">${this.processInlineMarkdown(trimmed.substring(2))}</blockquote>`);
          continue;
        }

        // Regular paragraph line
        if (trimmed === '') {
          processedLines.push('');
        } else {
          processedLines.push(this.processInlineMarkdown(line));
        }
      }

      // Close any open code block or list
      if (inCodeBlock && codeBlockContent.length > 0) {
        const code = codeBlockContent.join('\n');
        processedLines.push(`<pre class="baseai-widget-markdown-pre"><code class="baseai-widget-markdown-code">${this.escapeHtml(code)}</code></pre>`);
      }
      if (inList && listItems.length > 0) {
        processedLines.push(`<${listType} class="baseai-widget-markdown-${listType}">${listItems.join('')}</${listType}>`);
      }

      // Join lines and wrap paragraphs
      let html = processedLines.join('\n');
      
      // Split by double newlines to create paragraphs
      const paragraphs = html.split(/\n\n+/);
      html = paragraphs.map(para => {
        para = para.trim();
        if (!para) return '';
        // Don't wrap if it's already a block element
        if (/^<(h[1-6]|ul|ol|pre|blockquote|hr|li)/.test(para)) {
          return para;
        }
        return `<p class="baseai-widget-markdown-p">${para}</p>`;
      }).join('');

      return html;
    }

    // Process inline markdown (bold, italic, links, inline code)
    processInlineMarkdown(text) {
      if (!text || typeof text !== 'string') {
        return '';
      }

      let html = this.escapeHtml(text);

      // Images first (before links)
      html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="baseai-widget-markdown-img" />');

      // Links
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="baseai-widget-markdown-link">$1</a>');

      // Inline code (single backticks) - must be before bold/italic
      html = html.replace(/`([^`]+)`/g, '<code class="baseai-widget-markdown-inline-code">$1</code>');

      // Bold (**text** or __text__) - process before italic
      html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong class="baseai-widget-markdown-strong">$1</strong>');
      html = html.replace(/__([^_]+?)__/g, '<strong class="baseai-widget-markdown-strong">$1</strong>');

      // Italic (*text* or _text_) - match single asterisks/underscores
      // Since bold is already processed, remaining * and _ are for italic
      html = html.replace(/\*([^*\n]+?)\*/g, '<em class="baseai-widget-markdown-em">$1</em>');
      html = html.replace(/_([^_\n]+?)_/g, '<em class="baseai-widget-markdown-em">$1</em>');

      return html;
    }

    addMessage(type, text) {
      const messagesContainer = document.getElementById(`${this.containerId}-messages`);
      if (!messagesContainer) return null;

      // Remove "Start a conversation" header when first message is added
      if (this.messages.length === 0) {
        const existingHeader = messagesContainer.querySelector('.baseai-widget-greeting-header');
        if (existingHeader) {
          existingHeader.remove();
        }
        const existingGreeting = messagesContainer.querySelector('.baseai-widget-greeting-message');
        if (existingGreeting) {
          existingGreeting.remove();
        }
      }

      const messageId = `msg-${Date.now()}-${Math.random()}`;
      const messageDiv = document.createElement('div');
      messageDiv.id = messageId;
      messageDiv.className = `baseai-widget-message ${type}`;

      const bubble = document.createElement('div');
      bubble.className = 'baseai-widget-message-bubble';
      
      // Parse function calls from text
      const { text: cleanText, functionCalls } = this.parseFunctionCalls(text);
      
      // Add text content with markdown rendering
      if (cleanText) {
        const markdownHtml = this.renderMarkdown(cleanText);
        const textContainer = document.createElement('div');
        textContainer.className = 'baseai-widget-markdown-content';
        textContainer.innerHTML = markdownHtml;
        bubble.appendChild(textContainer);
      }
      
      // Add function calls if present and debug is enabled
      if (functionCalls && this.debug) {
        const functionCallsElement = this.createFunctionCallsElement(functionCalls);
        bubble.appendChild(functionCallsElement);
      }

      messageDiv.appendChild(bubble);
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      this.messages.push({ id: messageId, type, text });
      return messageId;
    }

    addLoadingMessage() {
      const messagesContainer = document.getElementById(`${this.containerId}-messages`);
      if (!messagesContainer) return null;

      const messageId = `loading-${Date.now()}`;
      const messageDiv = document.createElement('div');
      messageDiv.id = messageId;
      messageDiv.className = 'baseai-widget-message assistant';

      const loading = document.createElement('div');
      loading.className = 'baseai-widget-loading';
      loading.innerHTML = '<div class="baseai-widget-loading-dots"><span></span><span></span><span></span></div>';

      messageDiv.appendChild(loading);
      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      return messageId;
    }

    updateMessage(messageId, text) {
      const messageIndex = this.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex !== -1) {
        this.messages[messageIndex].text = text;
      }

      // Use requestAnimationFrame for smoother, faster DOM updates
      if (this._updateFrame) {
        cancelAnimationFrame(this._updateFrame);
      }
      
      this._updateFrame = requestAnimationFrame(() => {
        const messageDiv = document.getElementById(messageId);
        if (messageDiv) {
          const bubble = messageDiv.querySelector('.baseai-widget-message-bubble');
          if (bubble) {
            // Parse function calls from text
            const { text: cleanText, functionCalls } = this.parseFunctionCalls(text);
            
            // Clear existing content
            bubble.innerHTML = '';
            
            // Add text content with markdown rendering
            if (cleanText) {
              const markdownHtml = this.renderMarkdown(cleanText);
              const textContainer = document.createElement('div');
              textContainer.className = 'baseai-widget-markdown-content';
              textContainer.innerHTML = markdownHtml;
              bubble.appendChild(textContainer);
            }
            
            // Add function calls if present and debug is enabled
            if (functionCalls && this.debug) {
              const functionCallsElement = this.createFunctionCallsElement(functionCalls);
              bubble.appendChild(functionCallsElement);
            }
            
            const messagesContainer = document.getElementById(`${this.containerId}-messages`);
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          }
        }
        this._updateFrame = null;
      });
    }

    removeMessage(messageId) {
      const messageDiv = document.getElementById(messageId);
      if (messageDiv) {
        messageDiv.remove();
      }
    }
  }

  // Auto-initialize widget from script tag attributes
  function initWidget() {
    const scripts = document.querySelectorAll('script[data-agent-id]');
    scripts.forEach((script) => {
      const agentId = script.getAttribute('data-agent-id');
      // Support both new widget key (wk_xxx) and legacy API key (pk_xxx:sk_xxx)
      const widgetKey = script.getAttribute('data-widget-key');
      const apiKey = script.getAttribute('data-api-key');
      const keyToUse = widgetKey || apiKey;
      const apiUrl = script.getAttribute('data-api-url');
      const title = script.getAttribute('data-title');
      const debug = script.getAttribute('data-debug') === 'true' || script.getAttribute('data-show-debug') === 'true';
      const containerId = `baseai-widget-${agentId}`;

      if (!keyToUse || keyToUse === 'YOUR_API_KEY' || keyToUse === 'YOUR_WIDGET_KEY') {
        console.error('BaseAI Widget: Please set your widget key in the data-widget-key attribute');
        return;
      }

      // Validate widget key format (should start with wk_ for widget keys)
      if (widgetKey && !widgetKey.startsWith('wk_')) {
        console.warn('BaseAI Widget: Widget key should start with wk_. Using provided key as-is.');
      }

      if (!agentId) {
        console.error('BaseAI Widget: Agent ID is required');
        return;
      }

      new BaseAIChatWidget({
        apiKey: keyToUse,
        agentId,
        apiUrl,
        title,
        containerId,
        debug,
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Export for manual initialization
  window.BaseAIChatWidget = BaseAIChatWidget;
})();

