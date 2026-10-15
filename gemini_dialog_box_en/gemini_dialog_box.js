// ==UserScript==
// @name         Gemini Dialog Box
// @namespace    https://gemini.google.com/
// @version      1.0.0
// @description  A floating sidebar to smoothly jump and switch between your sent prompt dialogue boxes in Google Gemini chats.
// @author       You
// @match        https://gemini.google.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.__GEMINI_DIALOG_BOX_LOADED__) return;
  window.__GEMINI_DIALOG_BOX_LOADED__ = true;

  // --- Configuration & State ---
  const STATE = {
    prompts: [],          // { id, index, text, element }
    activeIndex: -1,      // Current highlighted prompt index (0-based)
    isCollapsed: false,   // Collapsed status
    searchQuery: '',      // Search filter text
    lastUrl: location.href
  };

  // Selectors for Gemini user query bubbles
  const USER_QUERY_SELECTORS = [
    'user-query',
    '[data-message-author-role="user"]',
    '.user-query-container'
  ];

  // Internal text selectors
  const QUERY_TEXT_SELECTORS = [
    '.query-text',
    'user-query-content .query-text',
    '.user-query-bubble-with-background',
    'user-query-content'
  ];

  // --- Style Injection ---
  function injectStyles() {
    if (document.getElementById('gdb-styles')) return;
    const style = document.createElement('style');
    style.id = 'gdb-styles';
    style.textContent = `
      :root {
        --gdb-bg: rgba(255, 255, 255, 0.96);
        --gdb-border: rgba(0, 0, 0, 0.10);
        --gdb-text: #1f1f1f;
        --gdb-subtext: #5f6368;
        --gdb-hover: #f1f5f9;
        --gdb-active-bg: #e8f0fe;
        --gdb-active-text: #1967d2;
        --gdb-accent: #1a73e8;
        --gdb-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
        --gdb-input-bg: #f1f3f4;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --gdb-bg: rgba(30, 31, 32, 0.96);
          --gdb-border: rgba(255, 255, 255, 0.12);
          --gdb-text: #e3e3e3;
          --gdb-subtext: #9aa0a6;
          --gdb-hover: rgba(255, 255, 255, 0.07);
          --gdb-active-bg: rgba(138, 180, 248, 0.18);
          --gdb-active-text: #8ab4f8;
          --gdb-accent: #8ab4f8;
          --gdb-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
          --gdb-input-bg: #282a2c;
        }
      }

      body.dark-theme, [data-theme="dark"], html.dark {
        --gdb-bg: rgba(30, 31, 32, 0.96);
        --gdb-border: rgba(255, 255, 255, 0.12);
        --gdb-text: #e3e3e3;
        --gdb-subtext: #9aa0a6;
        --gdb-hover: rgba(255, 255, 255, 0.07);
        --gdb-active-bg: rgba(138, 180, 248, 0.18);
        --gdb-active-text: #8ab4f8;
        --gdb-accent: #8ab4f8;
        --gdb-shadow: 0 8px 30px rgba(0, 0, 0, 0.45);
        --gdb-input-bg: #282a2c;
      }

      #gdb-root {
        position: fixed;
        top: 84px;
        right: 18px;
        z-index: 99999;
        font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--gdb-text);
        user-select: none;
      }

      #gdb-panel {
        width: 280px;
        max-height: calc(100vh - 140px);
        background: var(--gdb-bg);
        backdrop-filter: blur(12px);
        border: 1px solid var(--gdb-border);
        border-radius: 16px;
        box-shadow: var(--gdb-shadow);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      #gdb-root.gdb-collapsed #gdb-panel {
        display: none;
      }

      #gdb-toggle-pill {
        display: none;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        background: var(--gdb-bg);
        backdrop-filter: blur(12px);
        border: 1px solid var(--gdb-border);
        border-radius: 999px;
        box-shadow: var(--gdb-shadow);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--gdb-text);
        transition: transform 0.15s ease;
      }

      #gdb-toggle-pill:hover {
        transform: translateY(-1px);
      }

      #gdb-root.gdb-collapsed #gdb-toggle-pill {
        display: inline-flex;
      }

      .gdb-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px 8px;
        border-bottom: 1px solid var(--gdb-border);
        cursor: move;
      }

      .gdb-title-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13.5px;
        font-weight: 600;
      }

      .gdb-badge {
        background: var(--gdb-active-bg);
        color: var(--gdb-active-text);
        font-size: 11px;
        font-weight: 600;
        padding: 1px 7px;
        border-radius: 999px;
      }

      .gdb-controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .gdb-icon-btn {
        background: transparent;
        border: none;
        color: var(--gdb-subtext);
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

      .gdb-icon-btn:hover {
        background: var(--gdb-hover);
        color: var(--gdb-text);
      }

      .gdb-search-box {
        padding: 8px 12px;
        border-bottom: 1px solid var(--gdb-border);
      }

      .gdb-search-input {
        width: 100%;
        box-sizing: border-box;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid transparent;
        background: var(--gdb-input-bg);
        color: var(--gdb-text);
        font-size: 12.5px;
        outline: none;
      }

      .gdb-search-input:focus {
        border-color: var(--gdb-accent);
      }

      .gdb-list {
        overflow-y: auto;
        padding: 6px 8px;
        max-height: calc(100vh - 255px);
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .gdb-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.15s ease;
        position: relative;
      }

      .gdb-item:hover {
        background: var(--gdb-hover);
      }

      .gdb-item.gdb-active {
        background: var(--gdb-active-bg);
        color: var(--gdb-active-text);
      }

      .gdb-item-index {
        font-size: 11px;
        font-weight: 600;
        color: var(--gdb-subtext);
        min-width: 22px;
        padding-top: 1px;
      }

      .gdb-item.gdb-active .gdb-item-index {
        color: var(--gdb-active-text);
      }

      .gdb-item-text {
        flex: 1;
        font-size: 12.5px;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }

      .gdb-item-actions {
        display: none;
        align-items: center;
        gap: 2px;
      }

      .gdb-item:hover .gdb-item-actions {
        display: inline-flex;
      }

      .gdb-mini-action {
        background: var(--gdb-bg);
        border: 1px solid var(--gdb-border);
        color: var(--gdb-subtext);
        border-radius: 5px;
        padding: 2px 6px;
        font-size: 11px;
        cursor: pointer;
      }

      .gdb-mini-action:hover {
        color: var(--gdb-active-text);
        border-color: var(--gdb-accent);
      }

      .gdb-empty {
        padding: 20px 12px;
        text-align: center;
        font-size: 12.5px;
        color: var(--gdb-subtext);
      }

      .gdb-footer {
        padding: 6px 12px;
        border-top: 1px solid var(--gdb-border);
        font-size: 11px;
        color: var(--gdb-subtext);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      @keyframes gdbPulseHighlight {
        0%   { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0.55); outline: 2px solid var(--gdb-accent); }
        70%  { box-shadow: 0 0 0 10px rgba(26, 115, 232, 0); outline: 2px solid var(--gpn-accent); }
        100% { box-shadow: 0 0 0 0 rgba(26, 115, 232, 0); outline: 2px solid transparent; }
      }

      .gdb-highlight-target {
        border-radius: 14px !important;
        animation: gdbPulseHighlight 1.6s ease-out;
      }
    `;
    document.head.appendChild(style);
  }

  // --- Safe DOM builder to satisfy CSP / Trusted Types ---
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
    if (document.getElementById('gdb-root')) return;

    countBadgeEl = el('span', { className: 'gdb-badge', textContent: '0' });
    pillCountEl = el('span', { className: 'gdb-badge', textContent: '0' });

    const prevBtn = el('button', {
      className: 'gdb-icon-btn',
      title: 'Previous dialog (Alt + ↑)',
      textContent: '↑',
      onClick: () => jumpRelative(-1)
    });

    const nextBtn = el('button', {
      className: 'gdb-icon-btn',
      title: 'Next dialog (Alt + ↓)',
      textContent: '↓',
      onClick: () => jumpRelative(1)
    });

    const refreshBtn = el('button', {
      className: 'gdb-icon-btn',
      title: 'Refresh dialog list',
      textContent: '↻',
      onClick: () => scanPrompts(true)
    });

    const collapseBtn = el('button', {
      className: 'gdb-icon-btn',
      title: 'Collapse panel',
      textContent: '—',
      onClick: () => toggleCollapse(true)
    });

    const headerEl = el('div', { className: 'gdb-header' }, [
      el('div', { className: 'gdb-title-wrap' }, [
        el('span', { textContent: '💬 Dialogs' }),
        countBadgeEl
      ]),
      el('div', { className: 'gdb-controls' }, [prevBtn, nextBtn, refreshBtn, collapseBtn])
    ]);

    searchInputEl = el('input', {
      className: 'gdb-search-input',
      type: 'text',
      placeholder: 'Search sent dialogs...',
      onInput: (e) => {
        STATE.searchQuery = (e.target.value || '').trim().toLowerCase();
        renderList();
      }
    });

    const searchBoxEl = el('div', { className: 'gdb-search-box' }, [searchInputEl]);

    listEl = el('div', { className: 'gdb-list' });

    statusEl = el('span', { textContent: 'Alt + ↑ / ↓' });
    const footerEl = el('div', { className: 'gdb-footer' }, [
      statusEl,
      el('span', { textContent: 'Click item to jump' })
    ]);

    const panelEl = el('div', { id: 'gdb-panel' }, [
      headerEl,
      searchBoxEl,
      listEl,
      footerEl
    ]);

    const togglePillEl = el('div', {
      id: 'gdb-toggle-pill',
      title: 'Expand Gemini Dialog Box',
      onClick: () => toggleCollapse(false)
    }, [
      el('span', { textContent: '💬 Dialogs' }),
      pillCountEl
    ]);

    rootEl = el('div', { id: 'gdb-root' }, [panelEl, togglePillEl]);
    document.body.appendChild(rootEl);

    enableDrag(headerEl, rootEl);
  }

  function toggleCollapse(collapse) {
    STATE.isCollapsed = collapse;
    if (!rootEl) return;
    if (collapse) {
      rootEl.classList.add('gdb-collapsed');
    } else {
      rootEl.classList.remove('gdb-collapsed');
    }
  }

  // --- Drag & reposition floating panel ---
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

  // --- Extract user prompt text cleanly ---
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
        id: `gdb-prompt-${idx}`,
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

  // --- Render Dialog List ---
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
          className: 'gdb-empty',
          textContent: total === 0
            ? 'No sent dialogs in this chat yet'
            : 'No matching dialogs found'
        })
      );
      return;
    }

    filtered.forEach((item) => {
      const isActive = item.index === STATE.activeIndex;
      const copyBtn = el('button', {
        className: 'gdb-mini-action',
        title: 'Copy dialog text',
        textContent: 'Copy',
        onClick: (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(item.text).then(() => {
            showToast(`Copied dialog #${item.index + 1}`);
          });
        }
      });

      const reuseBtn = el('button', {
        className: 'gdb-mini-action',
        title: 'Paste into bottom input box',
        textContent: 'Fill',
        onClick: (e) => {
          e.stopPropagation();
          fillPromptIntoInput(item.text);
        }
      });

      const row = el('div', {
        className: `gdb-item${isActive ? ' gdb-active' : ''}`,
        'data-index': String(item.index),
        onClick: () => jumpToPrompt(item.index)
      }, [
        el('span', { className: 'gdb-item-index', textContent: `#${item.index + 1}` }),
        el('div', { className: 'gdb-item-text', textContent: item.text }),
        el('div', { className: 'gdb-item-actions' }, [copyBtn, reuseBtn])
      ]);

      listEl.appendChild(row);
    });
  }

  // --- Smooth Scroll & Pulse Highlight ---
  function jumpToPrompt(index) {
    const target = STATE.prompts[index];
    if (!target || !target.element) return;

    STATE.activeIndex = index;
    updateActiveRowUI();

    target.element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    target.element.classList.remove('gdb-highlight-target');
    void target.element.offsetWidth; // trigger reflow
    target.element.classList.add('gdb-highlight-target');

    showToast(`Jumped to dialog #${index + 1}`);
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
    const rows = listEl.querySelectorAll('.gdb-item');
    rows.forEach((row) => {
      const idx = Number(row.getAttribute('data-index'));
      if (idx === STATE.activeIndex) {
        row.classList.add('gdb-active');
        row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        row.classList.remove('gdb-active');
      }
    });
  }

  // --- Paste prompt into Gemini input box ---
  function fillPromptIntoInput(text) {
    const editor =
      document.querySelector('rich-textarea .ql-editor[contenteditable="true"]') ||
      document.querySelector('[contenteditable="true"][role="textbox"]') ||
      document.querySelector('textarea');

    if (!editor) {
      navigator.clipboard.writeText(text);
      showToast('Copied to clipboard');
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
    showToast('Filled into input box');
  }

  function showToast(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      if (statusEl) statusEl.textContent = 'Alt + ↑ / ↓';
    }, 2200);
  }

  // --- Shortcuts & Route / Mutation Observer ---
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

  // --- Initialization ---
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