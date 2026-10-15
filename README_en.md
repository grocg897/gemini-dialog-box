# Gemini Dialog Box

> 🌐 English | [中文说明文档](./README.md)

A lightweight user dialogue box built with AI, designed for Google Gemini Web. Have a good day!

## Features

- 📑 **Instant Dialogue Directory**: Automatically indexes all user-sent prompt boxes (`<user-query>`) in the active conversation into a clean sidebar list.
- 🎯 **One-Click Smooth Jump**: Click any prompt item in the directory to smoothly scroll the viewport to that exact dialogue box with an eye-catching pulse highlight.
- ⌨️ **Keyboard Navigation**: Press `Alt + ↑` (or `Alt + K`) for previous prompt, and `Alt + ↓` (or `Alt + J`) for next prompt.
- 🔍 **Real-Time Search**: Filter through dozens of historical prompts in long chats instantly.
- 📋 **Quick Copy & Refill**: Hover over any prompt to copy its content or refill it directly into Gemini's bottom input box for quick editing and resending.
- 🌓 **Adaptive & Draggable**: Dark/Light mode theme auto-detection, collapsible mini floating pill, and draggable header.

## Installation

### Method 1: Chrome / Edge Unpacked Extension (Recommended)

1. Download or clone this repository to your computer.
2. Open your browser's extension management page:
   - **Chrome**: Navigate to `chrome://extensions/`
   - **Microsoft Edge**: Navigate to `edge://extensions/`
3. Toggle on **Developer mode** (top-right on Chrome, bottom-left on Edge).
4. Click **Load unpacked** and select the `gemini_dialog_box_en` folder.
5. Visit [Google Gemini](https://gemini.google.com/) and refresh the page!

### Method 2: Tampermonkey Userscript

1. Install the [Tampermonkey](https://www.tampermonkey.net/) extension from the Chrome Web Store or Edge Add-ons.
2. Click the Tampermonkey icon -> **Create a new script**.
3. Copy and paste the content of `gemini_dialog_box_en/gemini_dialog_box.js` into the editor and press `Ctrl + S` to save.
4. Refresh [Google Gemini](https://gemini.google.com/).

## Project Structure

```text
gemini-dialog-box/
├── gemini_dialog_box_en/       # English extension folder (ready to load)
│   ├── manifest.json
│   └── gemini_dialog_box.js
├── gemini_dialog_box_zh/       # Chinese extension folder (ready to load)
│   ├── manifest.json
│   └── gemini_dialog_box.js
├── README.md                   # Chinese documentation (rendered on homepage)
├── README_en.md                # English documentation
└── LICENSE                     # MIT License
```

## Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Alt + ↑` / `Alt + K` | Switch to previous sent prompt box |
| `Alt + ↓` / `Alt + J` | Switch to next sent prompt box |

## License

[MIT](./LICENSE)
