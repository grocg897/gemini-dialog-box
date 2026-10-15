# Gemini 对话框导航器

> 🌐 [English Documentation](./README_en.md) | 简体中文

利用AI打造的轻量级用户对话框，适用于Gemini网页端。祝有一个美好的一天！

## 核心功能

* 📑 **自动生成提问目录**：实时索引当前会话中你发送过的所有对话框（`<user-query>`），生成清晰的侧边目录列表。
* 🎯 **一键平滑跳转**：点击目录中的任意历史提问，页面平滑滚动定位到该对话框并伴随醒目的脉冲边框高亮。
* ⌨️ **快捷键上下切换**：按 `Alt + ↑`（或 `Alt + K`）快速切回上一条提问，按 `Alt + ↓`（或 `Alt + J`）切到下一条提问。
* 🔍 **实时关键词搜索**：在长达数十轮的对话中快速筛选特定的历史提问。
* 📋 **快捷复制与填入**：鼠标悬停在任意提问上，可一键复制内容，或直接塞回底部输入框再次编辑重发。
* 🌓 **自适应与自由拖拽**：自动跟随系统/Gemini的明暗主题、支持收起为迷你悬浮胶囊球，并可拖拽改变位置。

## 安装指南

### 方式一：Chrome / Edge 加载已解压扩展（推荐）

1. 下载或克隆本项目到本地电脑。
2. 打开浏览器的扩展程序管理页面：
   * **Chrome**: 访问 `chrome://extensions/`
   * **Microsoft Edge**: 访问 `edge://extensions/`
3. 开启**开发者模式**（Chrome在右上角，Edge在左下角）。
4. 点击**「加载已解压的扩展程序」**（Load unpacked），选择 `gemini_dialog_box_zh` 文件夹即可。
5. 打开 [Google Gemini](https://gemini.google.com/) 刷新页面即可生效。

### 方式二：Tampermonkey 油猴脚本安装

1. 安装浏览器插件 [Tampermonkey（篡改猴）](https://www.tampermonkey.net/)。
2. 点击篡改猴图标 -> **「添加新脚本」**。
3. 复制 `gemini_dialog_box_zh/gemini_dialog_box.js` 的代码并按 `Ctrl + S` 保存。
4. 刷新 [Google Gemini](https://gemini.google.com/) 页面即可使用。

## 目录结构

```text
gemini-dialog-box/
├── gemini_dialog_box_zh/       # 中文版扩展文件夹 (直接可加载)
│   ├── manifest.json
│   └── gemini_dialog_box.js
├── gemini_dialog_box_en/       # 英文版扩展文件夹 (直接可加载)
│   ├── manifest.json
│   └── gemini_dialog_box.js
├── README.md                   # 中文说明文档（主页默认展示）
├── README_en.md                # 英文说明文档
└── LICENSE                     # MIT 开源许可证
```

## 快捷键列表

| 快捷键                   | 功能            |
|:--------------------- |:------------- |
| `Alt + ↑` / `Alt + K` | 切换到上一条已发送的提问框 |
| `Alt + ↓` / `Alt + J` | 切换到下一条已发送的提问框 |

## 开源协议

[MIT](./LICENSE)
