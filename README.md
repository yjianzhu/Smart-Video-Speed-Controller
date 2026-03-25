# Smart Video Speed Controller

> 📺 A modern Chrome extension that **automatically remembers and applies video playback speeds** on a per-page basis.

🌐 [中文文档 (Chinese README)](./README_CN.md)

---

## ✨ Features

- **🎥 Per-Page Memory** — Each page's video speed is saved independently. Refresh or revisit later and the speed is automatically restored.
- **🌍 Global Default Speed** — Set your own default speed (e.g. 1.25x) for pages without an individual setting. No more stuck at 1.0x.
- **⌨️ Keyboard Shortcuts** — `Alt + .` to speed up, `Alt + ,` to slow down, `Alt + 0` to reset. Fully customizable via `chrome://extensions/shortcuts`.
- **🔄 Bidirectional Sync** — Changed speed via YouTube/Bilibili's native controls? The extension picks it up and remembers it automatically.
- **👻 Shadow DOM Support** — Works with complex players (Vimeo, etc.) that hide `<video>` elements inside Shadow DOM.
- **💅 Glassmorphism UI** — A sleek dark-themed interface with frosted-glass cards and smooth micro-animations.
- **💾 Smart Storage** — LRU eviction keeps your storage clean. Entries at default speed are auto-deleted. Max 500 entries.

## 📸 Screenshots

_Coming soon._

## 📦 Installation

### From Source (Developer Mode)

1. Clone or download this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the **`src`** folder inside this project.

### For General Users (Install via ZIP)

1. Go to the [Releases page](../../releases/latest).
2. Download the `extension.zip` file.
3. **Extract** the zip file into an empty folder on your computer.
4. Open `chrome://extensions/` in Chrome.
5. Enable **Developer mode** (top-right toggle).
6. Click **Load unpacked** and select the folder you just extracted.

### From Chrome Web Store

_Coming soon._

## 🔧 How It Works

### URL Matching

Each page is identified by its full URL **without the `#hash`** fragment:

| URL | Key |
|---|---|
| `https://example.com/course/1` | `https://example.com/course/1` |
| `https://example.com/course/2` | `https://example.com/course/2` |
| `https://example.com/watch?v=abc#t=60` | `https://example.com/watch?v=abc` |

Hash changes within the same page do **not** create a new entry.

### Architecture

```
├── README.md              # English docs
├── README_CN.md           # Chinese docs
├── .github/workflows/     # CI/CD
└── src/                   # Extension source (load this in Chrome)
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── popup.html
    ├── popup.css
    └── popup.js
```

| File | Role |
|---|---|
| `src/manifest.json` | Extension config (MV3) |
| `src/content.js` | Injected into every page — controls video speed, listens for URL/DOM changes |
| `src/popup.html/css/js` | Popup dashboard UI |
| `src/background.js` | Service worker — handles badge updates and keyboard shortcut commands |

## ⌨️ Default Shortcuts

| Shortcut | Action |
|---|---|
| `Alt + .` | Speed up (+0.1x) |
| `Alt + ,` | Slow down (−0.1x) |
| `Alt + 0` | Reset to default |

Customize anytime at `chrome://extensions/shortcuts`.

## 🛣️ Roadmap

- [ ] Domain-level memory mode (remember speed per domain instead of per URL)
- [ ] Firefox / Edge compatibility
- [ ] Chrome Web Store publication
- [ ] Export / import settings

## 📄 License

MIT
