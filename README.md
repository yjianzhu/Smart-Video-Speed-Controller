# Smart Video Speed Controller / 网页视频倍速记忆大师

📺 A modern Chrome extension to automatically remember and apply video playback speeds on a per-page basis. \
告别全局统一倍速时代！这是一款现代化的 Chrome 视频倍速控制器，能够为每个网页独立记忆您设置的播放速度。

## ✨ 核心特性 (Features)

- **🎥 单页记忆 (Per-Page Memory)**: 每个页面的视频倍速独立保存，刷新或下次打开时自动恢复。
- **🌍 全局默认倍速 (Global Default)**: 当页面无独立记忆时，使用您设定的专属全局默认值（例如默认 1.25x），不再局限于原本的 1.0x。
- **⌨️ 快捷键支持 (Shortcuts)**: 默认支持 `Alt + .` 加速、`Alt + ,` 减速、`Alt + 0` 重置，全键盘操控更顺畅。
- **🔄 双向同步 (Bidirectional Sync)**: 如果您使用网页（如 YouTube/B站）自带的播放器快捷键或按钮调整了速度，插件会自动感知并记住最新的速度！
- **👻 Shadow DOM 穿透**: 完美支持 Vimeo 等将视频隐藏在 Shadow DOM 节点内部的复杂播放器。
- **💅 玻璃拟态 UI (Glassmorphism)**: 极具现代感的全新暗黑毛玻璃界面，自带微动效。

## 📦 本地安装 (Installation)

1. 在 Chrome 地址栏输入并打开：`chrome://extensions/`
2. 打开右上角的 **开发者模式 (Developer mode)**
3. 点击 **加载已解压的扩展程序 (Load unpacked)**
4. 选择本项目所在的文件夹。

## 💡 匹配逻辑 (Matching Logic)

当前版本根据完整 URL（去除了 `#hash` 参数）作为唯一键进行匹配：
- `https://example.com/course/1` 和 `/course/2` 被视为两个不同页面，独立记忆。
- `https://example.com/watch?v=1` 和 `?v=2` 独立记忆。
- 页面内的 Hash (`#`) 变化不会切分记录（以防单面应用不断产生新数据）。

## 🚀 后续开发计划 (TODOs)

- 支持在 Popup 控制面板中切换“按域名记忆 (Domain)”与“按确切页面记忆 (URL)”两种模式。
- 进一步优化 Storage 容量管理（LRU 清理策略增强）。
- Firefox 兼容性适配。
