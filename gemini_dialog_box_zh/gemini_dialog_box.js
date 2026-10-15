// ==UserScript==
// @name         Gemini 提问导航器 (Prompt Navigator)
// @namespace    https://gemini.google.com/
// @version      1.0.0
// @description  在 Google Gemini 页面右侧添加已发送对话框/提问目录，支持点击任意切换跳转、Alt+↑/↓快捷切换、搜索过滤与一键重新填入输入框
// @author       Gemini
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.__GEMINI_PROMPT_NAVIGATOR_LOADED__) return;
  window.__GEMINI_PROMPT_NAVIGATOR_LOADED__ = true;

  // --- 配置与状态 ---
  const STATE = {
    prompts: [],          // { id, index, text, element }
    activeIndex: -1,      // 当前高亮的提问索引 (0-based)
    isCollapsed: false,   // 面板是否收起
    searchQuery: '',      // 搜索过滤词
    lastUrl: location.href
  };

  // Gemini 用户发送消息框的多重兼容选择器
  const USER_QUERY_SELECTORS = [
    'user-query',
    '[data-message-author-role="user"]',
    '.user-query-container'
  ];

  // 提取单条用户提问文本的内部选择器优先级
  const QUERY_TEXT_SELECTORS = [
    '.query-text',
    'user-query-content .query-text',
    '.user-query-bubble-with-background',
    'user-query-content'
  ];

  // --- 样式注入 ---
  function injectStyles() {
    if (document.getElementById('gpn-styles')) return;
    const style = document.createElement('style');
    style.id = 'gpn-styles';
    style.textContent = `
      :root {
        --gpn-bg: rgba(255, 255, 255, 0.96);
        --gpn-border: rgba(0, 0, 0, 0.10);
        --gpn-text: #1f1f1f;
        --gpn-subtext: #5f6368;
        --gpn-hover: #f1f5f9;
        --gpn-active-bg: #e8f0fe;
        --gpn-active-text: #1967d2;
        --gpn-accent: #1a73e8;
        --gpn-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
        --gpn-input-bg: #f1f3f4;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --gpn-bg: rgba(30, 31, 32, 0.96);
          --gpn-border: rgba(255, 255, 255, 0.12);
          --gpn-text: #e3e3e3;
          --gpn-subtext: #9aa0a6;
          --gpn-hover: rgba(255, 255, 255, 0.07);
          --gpn-active-bg: rgba(138, 180, 248, 0.18);
          --gpn-active-text: #8ab4f8;
          --gpn-accent: #8ab4f8;
          --gpn-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
          --gpn-input-bg: #282a2c;
        }
      }

      body.dark-theme, [data-theme="dark"], html.dark {
        --gpn-bg: rgba(30, 31, 32, 0.96);
        --gpn-border: rgba(255, 255, 255, 0.12);
        --gpn-text: #e3e3e3;
        --gpn-subtext: #9aa0a6;
        --gpn-hover: rgba(255, 255, 255, 0.07);
        --gpn-active-bg: rgba(138, 180, 248, 0.18);
        --gpn-active-text: #8ab4f8;
        --gpn-accent: #8ab4f8;
        --gpn-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
        --gpn-input-bg: #282a2c;
      }

      #gpn-root {
        position: fixed;
        top: 84px;
        right: 18px;
        z-index: 99999;
        font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--gpn-text);
        user-select: none;
      }

      #gpn-panel {
        width: 280px;
        max-height: calc(100vh - 140px);
        background: var(--gpn-bg);
        backdrop-filter: blur(12px);
        border: 1px solid var(--gpn-border);
        border-radius: 16px;
        box-shadow: var(--gpn-shadow);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      #gpn-root.gpn-collapsed #gpn-panel {
        display: none;
      }

      #gpn-toggle-pill {
        display: none;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: var(--gpn-bg);
        backdrop-filter: blur(12px);
        border: 1px solid var(--gpn-border);
        border-radius: 999px;
        box-shadow: var(--gpn-shadow);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--gpn-text);
        transition: transform 0.15s ease;
      }

      #gpn-toggle-pill:hover {
        transform: translateY(-1px);
      }

      #gpn-root.gpn-collapsed #gpn-toggle-pill {
        display: inline-flex;
      }

      .gpn-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px 8px;
        border-bottom: 1px solid var(--gpn-border);
        cursor: move;
      }

      .gpn-title-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13.5px;
        font-weight: 600;
      }

      .gpn-badge {
        background: var(--gpn-active-bg);
        color: var(--gpn-active-text);
        font-size: 11px;
        font-weight: 600;
        padding: 1px 7px;
        border-radius: 999px;
      }

      .gpn-controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .gpn-icon-btn {
        background: transparent;
        border: none;
        color: var(--gpn-subtext);
        width: 26px;
        height: 26px;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        transition: background 0.15s, color 0.15s;
      }

      .gpn-icon-btn:hover {
        background: var(--gpn-hover);
        color: var(--gpn-text);
      }

      .gpn-search-box {
        padding: 8px 12px;
        border-bottom: 1px solid var(--gpn-border);
      }

      .gpn-search-input {
        width: 100%;
        box-sizing: border-box;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: var(--gpn-input-bg);
        color: var(--gpn-text);
        font-size: 12.5px;
        outline: none;
      }

      .gpn-search-input:focus {
        border-color: var(--gpn-accent);
      }

      .gpn-list {
        overflow-y: auto;
        padding: 6px 8px;
        max-height: calc(100vh - 255px);
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .gpn-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.15s ease;
        position: relative;
      }

      .gpn-item:hover {
        background: var(--gpn-hover);
      }

      .gpn-item.gpn-active {
        background: var(--gpn-active-bg);
        color: var(--gpn-active-text);
      }

      .gpn-item-index {
        font-size: 11px;
        font-weight: 600;
        color: var(--gpn-subtext);
        min-width: 22px;
        padding-top: 1px;
      }

      .gpn-item.gpn-active .gpn-item-index {
        color: var(--gpn-active-text);
      }

      .gpn-item-text {
        flex: 1;
        font-size: 12.5px;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }

      .gpn-item-actions {
        display: none;
        align-items: center;
        gap: 2px;
      }

      .gpn-item:hover .gpn-item-actions {
        display: inline-flex;
      }

      .gpn-mini-action {
        background: var(--gpn-bg);
        border: 1px solid var(--gpn-border);
        color: var(--gpn-subtext);
        border-radius: 5px;
        padding: 2px 5px;
        font-size: 11px;
        cursor: pointer;
      }

      .gpn-mini-action:hover {
        color: var(--gpn-active-text);
        border-color: var(--gpn-accent);
      }

      .gpn-empty {
        padding: 20px 12px;
        text-align: center;
        font-size: 12.5px;
        color: var(--gpn-subtext);
      }

      .gpn-footer {
        padding: 6px 12px;
        border-top: 1px solid var(--gpn-border);
        font-size: 11px;
        color: var(--gpn-subtext);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      @keyframes gpnPulseHighlight {
        0%   { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.55); outline: 2px solid var(--gpn-accent); }
        70%  { box-shadow: 0 0 0 10px rgba(26, 115, 232, 0); outline: 2px solid var(--gpn-accent); }
        100% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0); outline: 2px solid transparent; }
      }

      .gpn-highlight-target {
        border-radius: 14px !important;
        animation: gpnPulseHighlight 1.6s ease-out;
      }
    `;
    document.head.appendChild(style);
  }

  // --- 构建 DOM 节点（避免使用 innerHTML 以兼容 Trusted Types CSP） ---
  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') node.className = v;
      else if (k === 'textContent') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') {
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else {
        node.setAttribute(k, v);
      }
    }
    for (const child of children) {
      if (child) node.appendChild(child);
    }
    return node;
  }

  let rootEl, listEl, countBadgeEl, pillCountEl, searchInputEl, statusEl;

  function createUI() {
    if (document.getElementById('gpn-root')) return;

    countBadgeEl = el('span', { className: 'gpn-badge', textContent: '0' });
    pillCountEl = el('span', { className: 'gpn-badge', textContent: '0' });

    const prevBtn = el('button', {
      className: 'gpn-icon-btn',
      title: '切换到上一条提问 (Alt + ↑)',
      textContent: '↑',
      onClick: () => jumpRelative(-1)
    });

    const nextBtn = el('button', {
      className: 'gpn-icon-btn',
      title: '切换到下一条提问 (Alt + ↓)',
      textContent: '↓',
      onClick: () => jumpRelative(1)
    });

    const refreshBtn = el('button', {
      className: 'gpn-icon-btn',
      title: '手动刷新提问列表',
      textContent: '↻',
      onClick: () => scanPrompts(true)
    });

    const collapseBtn = el('button', {
      className: 'gpn-icon-btn',
      title: '收起导航面板',
      textContent: '—',
      onClick: () => toggleCollapse(true)
    });

    const headerEl = el('div', { className: 'gpn-header' }, [
      el('div', { className: 'gpn-title-wrap' }, [
        el('span', { textContent: '💬 我的提问' }),
        countBadgeEl
      ]),
      el('div', { className: 'gpn-controls' }, [prevBtn, nextBtn, refreshBtn, collapseBtn])
    ]);

    searchInputEl = el('input', {
      className: 'gpn-search-input',
      type: 'text',
      placeholder: '搜索我发送过的对话框...',
      onInput: (e) => {
        STATE.searchQuery = (e.target.value || '').trim().toLowerCase();
        renderList();
      }
    });

    const searchBoxEl = el('div', { className: 'gpn-search-box' }, [searchInputEl]);

    listEl = el('div', { className: 'gpn-list' });

    statusEl = el('span', { textContent: '快捷键: Alt + ↑ / ↓' });
    const footerEl = el('div', { className: 'gpn-footer' }, [
      statusEl,
      el('span', { textContent: '点击任意项跳转' })
    ]);

    const panelEl = el('div', { id: 'gpn-panel' }, [
      headerEl,
      searchBoxEl,
      listEl,
      footerEl
    ]);

    const togglePillEl = el('div', {
      id: 'gpn-toggle-pill',
      title: '展开 Gemini 提问导航器',
      onClick: () => toggleCollapse(false)
    }, [
      el('span', { textContent: '💬 提问目录' }),
      pillCountEl
    ]);

    rootEl = el('div', { id: 'gpn-root' }, [panelEl, togglePillEl]);
    document.body.appendChild(rootEl);

    enableDrag(headerEl, rootEl);
  }

  function toggleCollapse(collapse) {
    STATE.isCollapsed = collapse;
    if (!rootEl) return;
    if (collapse) {
      rootEl.classList.add('gpn-collapsed');
    } else {
      rootEl.classList.remove('gpn-collapsed');
    }
  }

  // --- 支持拖拽悬浮窗位置 ---
  function enableDrag(handle, target) {
    let startX = 0, startY = 0, initTop = 0, initRight = 0, dragging = false;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = target.getBoundingClientRect();
      initTop = rect.top;
      initRight = window.innerWidth - rect.right;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      const dx = e.clientX - startX;
      const newTop = Math.max(12, Math.min(window.innerHeight - 80, initTop + dy));
      const newRight = Math.max(12, Math.min(window.innerWidth - 200, initRight - dx));
      target.style.top = `${newTop}px`;
      target.style.right = `${newRight}px`;
    });

    window.addEventListener('mouseup', () => {
      dragging = false;
    });
  }

  // --- 采集与清理用户发送的提问 ---
  function extractPromptText(queryNode) {
    for (const sel of QUERY_TEXT_SELECTORS) {
      const sub = queryNode.querySelector(sel);
      if (sub && sub.innerText && sub.innerText.trim()) {
        return cleanPromptText(sub.innerText);
      }
    }
    return cleanPromptText(queryNode.innerText || '');
  }

  function cleanPromptText(raw) {
    return raw
      .replace(/^(You said|你说)\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findUserQueryNodes() {
    for (const sel of USER_QUERY_SELECTORS) {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (nodes.length > 0) return nodes;
    }
    return [];
  }

  function scanPrompts(forceRender = false) {
    const nodes = findUserQueryNodes();
    const nextPrompts = [];

    nodes.forEach((node, idx) => {
      const text = extractPromptText(node);
      if (!text) return;
      nextPrompts.push({
        id: `gpn-prompt-${idx}`,
        index: nextPrompts.length,
        text,
        element: node
      });
    });

    const changed =
      forceRender ||
      nextPrompts.length !== STATE.prompts.length ||
      nextPrompts.some((p, i) => p.text !== (STATE.prompts[i] && STATE.prompts[i].text));

    if (changed) {
      STATE.prompts = nextPrompts;
      if (STATE.activeIndex >= STATE.prompts.length) {
        STATE.activeIndex = STATE.prompts.length - 1;
      }
      renderList();
    }
  }

  // --- 渲染提问目录 ---
  function renderList() {
    if (!listEl) return;
    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    const total = STATE.prompts.length;
    countBadgeEl.textContent = String(total);
    pillCountEl.textContent = String(total);

    const filtered = STATE.prompts.filter((p) => {
      if (!STATE.searchQuery) return true;
      return p.text.toLowerCase().includes(STATE.searchQuery);
    });

    if (filtered.length === 0) {
      listEl.appendChild(
        el('div', {
          className: 'gpn-empty',
          textContent: total === 0
            ? '当前对话暂无已发送的提问'
            : '没有匹配的提问内容'
        })
      );
      return;
    }

    filtered.forEach((item) => {
      const isActive = item.index === STATE.activeIndex;
      const copyBtn = el('button', {
        className: 'gpn-mini-action',
        title: '复制这条提问内容',
        textContent: '复制',
        onClick: (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(item.text).then(() => {
            showToast(`已复制第 #${item.index + 1} 条提问`);
          });
        }
      });

      const reuseBtn = el('button', {
        className: 'gpn-mini-action',
        title: '填入底部输入框再次编辑发送',
        textContent: '填入',
        onClick: (e) => {
          e.stopPropagation();
          fillPromptIntoInput(item.text);
        }
      });

      const row = el('div', {
        className: `gpn-item${isActive ? ' gpn-active' : ''}`,
        'data-index': String(item.index),
        onClick: () => jumpToPrompt(item.index)
      }, [
        el('span', { className: 'gpn-item-index', textContent: `#${item.index + 1}` }),
        el('div', { className: 'gpn-item-text', textContent: item.text }),
        el('div', { className: 'gpn-item-actions' }, [copyBtn, reuseBtn])
      ]);

      listEl.appendChild(row);
    });
  }

  // --- 跳转到指定提问对话框并高亮 ---
  function jumpToPrompt(index) {
    const target = STATE.prompts[index];
    if (!target || !target.element) return;

    STATE.activeIndex = index;
    updateActiveRowUI();

    target.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    target.element.classList.remove('gpn-highlight-target');
    // 触发重排以重新播放高亮动画
    void target.element.offsetWidth;
    target.element.classList.add('gpn-highlight-target');

    showToast(`已定位到第 #${index + 1} 条提问`);
  }

  function jumpRelative(delta) {
    if (STATE.prompts.length === 0) return;
    let nextIdx = STATE.activeIndex + delta;
    if (STATE.activeIndex === -1) {
      nextIdx = delta > 0 ? 0 : STATE.prompts.length - 1;
    } else {
      nextIdx = Math.max(0, Math.min(STATE.prompts.length - 1, nextIdx));
    }
    jumpToPrompt(nextIdx);
  }

  function updateActiveRowUI() {
    if (!listEl) return;
    const rows = listEl.querySelectorAll('.gpn-item');
    rows.forEach((row) => {
      const idx = Number(row.getAttribute('data-index'));
      if (idx === STATE.activeIndex) {
        row.classList.add('gpn-active');
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        row.classList.remove('gpn-active');
      }
    });
  }

  // --- 将历史提问重新填入 Gemini 底部输入框 ---
  function fillPromptIntoInput(text) {
    const editor =
      document.querySelector('rich-textarea .ql-editor[contenteditable="true"]') ||
      document.querySelector('[contenteditable="true"][role="textbox"]') ||
      document.querySelector('textarea');

    if (!editor) {
      navigator.clipboard.writeText(text);
      showToast('未找到输入框，已复制到剪贴板');
      return;
    }

    editor.focus();
    if (editor.tagName === 'TEXTAREA') {
      editor.value = text;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      editor.textContent = text;
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
    }
    showToast('已填入底部输入框');
  }

  function showToast(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      if (statusEl) statusEl.textContent = '快捷键: Alt + ↑ / ↓';
    }, 2200);
  }

  // --- 监听快捷键与页面滚动/路由变化 ---
  function bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        jumpRelative(-1);
      } else if (e.altKey && (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        jumpRelative(1);
      }
    });

    // 监听 DOM 动态新增对话与左侧会话切换
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (location.href !== STATE.lastUrl) {
        STATE.lastUrl = location.href;
        STATE.activeIndex = -1;
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => scanPrompts(false), 350);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // --- 启动入口 ---
  function init() {
    injectStyles();
    createUI();
    scanPrompts(true);
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();