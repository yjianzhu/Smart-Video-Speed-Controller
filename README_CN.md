# 网页视频倍速记忆大师 (Smart Video Speed Controller)

> 📺 一款现代化的 Chrome 浏览器扩展，能够为**每个网页独立记忆**您设置的视频播放速度。

🌐 [English README](./README.md)

---

## ✨ 核心特性

- **🎥 单页记忆** — 每个页面的视频倍速独立保存，刷新页面或下次再打开同一页面时自动恢复。
- **🌍 全局默认倍速** — 未单独设定的页面将使用您的自定义默认值（例如 1.25x），不再固定为 1.0x。
- **⌨️ 快捷键操控** — 默认 `Alt + .` 加速、`Alt + ,` 减速、`Alt + 0` 重置。可在 `chrome://extensions/shortcuts` 自由定制。
- **🔄 双向同步** — 如果您通过 YouTube、B站等网站自带的播放器界面调整了速度，插件会自动感知并记住最新值，不再强制覆盖。
- **👻 Shadow DOM 穿透** — 完美兼容 Vimeo 等将 `<video>` 元素隐藏在 Shadow DOM 中的复杂播放器。
- **💅 玻璃拟态 UI** — 全新的暗黑主题毛玻璃界面设计，自带流畅的微动效。
- **💾 智能存储** — 内置 LRU 淘汰策略，自动清理过期记录，最多保存 500 条。

## 📸 截图

_即将推出。_

## 📦 安装方式

### 本地开发者安装

1. 克隆或下载本仓库。
2. 在 Chrome 地址栏输入 `chrome://extensions/` 并打开。
3. 开启右上角的 **开发者模式**。
4. 点击 **加载已解压的扩展程序**，选择本项目所在的文件夹。

### Chrome Web Store

_即将上架。_

## 🔧 工作原理

### URL 匹配逻辑

每个页面以完整 URL（**去除 `#hash`**）作为唯一标识：

| 网址 | 唯一键 |
|---|---|
| `https://example.com/course/1` | `https://example.com/course/1` |
| `https://example.com/course/2` | `https://example.com/course/2` |
| `https://example.com/watch?v=abc#t=60` | `https://example.com/watch?v=abc` |

同一页面的 Hash 变化**不会**产生新记录。

### 文件架构

| 文件 | 用途 |
|---|---|
| `manifest.json` | 扩展配置（Manifest V3） |
| `content.js` | 注入到每个页面——控制视频速率，监听 URL 和 DOM 变化 |
| `popup.html/css/js` | 弹窗面板 UI |
| `background.js` | Service Worker——处理图标徽章更新和快捷键指令 |

## ⌨️ 默认快捷键

| 快捷键 | 操作 |
|---|---|
| `Alt + .` | 加速（+0.1x） |
| `Alt + ,` | 减速（−0.1x） |
| `Alt + 0` | 重置为默认速度 |

随时可在 `chrome://extensions/shortcuts` 自定义按键组合。

## 🛣️ 开发计划

- [ ] 支持"按域名记忆"模式（当前为按完整 URL 记忆）
- [ ] Firefox / Edge 浏览器兼容
- [ ] 上架 Chrome Web Store
- [ ] 导出 / 导入配置

## 📄 许可

MIT
