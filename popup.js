// ─── DOM References ──────────────────────────────────────────────────

const rateRange = document.getElementById('rateRange');
const rateLabel = document.getElementById('rateLabel');
const panel = document.getElementById('panel');
const unsupported = document.getElementById('unsupported');
const videoCard = document.getElementById('videoCard');
const videoCount = document.getElementById('videoCount');
const pageKey = document.getElementById('pageKey');
const minusBtn = document.getElementById('minusBtn');
const plusBtn = document.getElementById('plusBtn');
const resetBtn = document.getElementById('resetBtn');
const presets = document.getElementById('presets');
const defaultRateInput = document.getElementById('defaultRateInput');
const saveDefaultBtn = document.getElementById('saveDefaultBtn');
const gearBtn = document.getElementById('gearBtn');
const backBtn = document.getElementById('backBtn');
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');

const MIN_RATE = 0.25;
const MAX_RATE = 4.0;

// ─── Utilities ───────────────────────────────────────────────────────

function clampRate(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value)) return 1;
  const stepped = Math.round(value * 20) / 20;
  return Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, stepped)) * 100) / 100;
}

function renderRate(rate) {
  const safeRate = clampRate(rate);
  rateRange.value = String(safeRate);
  rateLabel.textContent = `${safeRate.toFixed(2)}x`;
  highlightPreset(safeRate);
}

function highlightPreset(rate) {
  const buttons = presets.querySelectorAll('button[data-rate]');
  for (const btn of buttons) {
    const btnRate = Number(btn.dataset.rate);
    if (Math.abs(btnRate - rate) < 0.001) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  }
}

// ─── Tab Communication ───────────────────────────────────────────────

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('No active tab');
  // Race against a timeout to prevent slow popup opening
  return Promise.race([
    chrome.tabs.sendMessage(tab.id, message),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500))
  ]);
}

// ─── State Loading ───────────────────────────────────────────────────

async function loadState() {
  // Always load global default (works even on unsupported pages)
  const data = await chrome.storage.local.get('globalSettings');
  const settings = data.globalSettings || {};
  defaultRateInput.value = String(settings.defaultRate ?? 1);

  try {
    const state = await sendToActiveTab({ type: 'GET_STATE' });
    if (!state?.ok) throw new Error(state?.error || 'Unsupported page');

    panel.classList.remove('hidden');
    videoCard.classList.remove('hidden');
    unsupported.classList.add('hidden');
    renderRate(state.rate);
    videoCount.textContent = String(state.videoCount ?? 0);
    pageKey.textContent = state.pageKey || '-';
  } catch (error) {
    panel.classList.add('hidden');
    videoCard.classList.add('hidden');
    unsupported.classList.remove('hidden');
  }
}

// ─── Rate Control ────────────────────────────────────────────────────

async function applyRate(rate) {
  const safeRate = clampRate(rate);
  renderRate(safeRate);
  const result = await sendToActiveTab({ type: 'SET_RATE', rate: safeRate });
  if (result?.ok) {
    renderRate(result.rate);
    videoCount.textContent = String(result.videoCount ?? 0);
  }
}

rateRange.addEventListener('input', (event) => {
  applyRate(event.target.value);
});

presets.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-rate]');
  if (!button) return;
  applyRate(button.dataset.rate);
});

minusBtn.addEventListener('click', () => {
  applyRate(Number(rateRange.value) - 0.1);
});

plusBtn.addEventListener('click', () => {
  applyRate(Number(rateRange.value) + 0.1);
});

resetBtn.addEventListener('click', async () => {
  const result = await sendToActiveTab({ type: 'RESET_RATE' });
  if (result?.ok) {
    renderRate(result.rate);
    videoCount.textContent = String(result.videoCount ?? 0);
  }
});

// ─── Global Default Rate ─────────────────────────────────────────────

saveDefaultBtn.addEventListener('click', async () => {
  const rate = clampRate(defaultRateInput.value);
  defaultRateInput.value = String(rate);

  const data = await chrome.storage.local.get('globalSettings');
  const settings = data.globalSettings || {};
  settings.defaultRate = rate;
  await chrome.storage.local.set({ globalSettings: settings });

  saveDefaultBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
    Saved!
  `;
  saveDefaultBtn.classList.add('saved');
  setTimeout(() => {
    saveDefaultBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      Save
    `;
    saveDefaultBtn.classList.remove('saved');
  }, 1500);
});

// ─── View Switching (Main ↔ Settings) ────────────────────────────────

gearBtn.addEventListener('click', () => {
  mainView.classList.add('hidden');
  settingsView.classList.remove('hidden');
});

backBtn.addEventListener('click', () => {
  settingsView.classList.add('hidden');
  mainView.classList.remove('hidden');
});

// ─── Customize Shortcuts Link ────────────────────────────────────────

document.getElementById('customizeShortcuts').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

// ─── Init ────────────────────────────────────────────────────────────

loadState();
