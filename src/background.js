// Background service worker
// Handles: badge updates, keyboard shortcut commands

// ─── Badge ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== '__BADGE__') return;
  const tabId = sender.tab?.id;
  if (!tabId) return;

  chrome.action.setBadgeText({ text: message.text || '', tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#2563eb', tabId });
});

// ─── Keyboard shortcuts (commands) ───────────────────────────────────

const COMMAND_MAP = {
  'speed-up': 'SPEED_UP',
  'speed-down': 'SPEED_DOWN',
  'reset-speed': 'RESET_RATE',
};

chrome.commands.onCommand.addListener(async (command) => {
  const messageType = COMMAND_MAP[command];
  if (!messageType) return;

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: messageType });
  } catch {
    // Content script not injected on this page — ignore
  }
});
