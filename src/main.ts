import './style.css';
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import { setBridge, setSettings } from './state';
import { loadSettings, loadTimerState } from './storage';
import { renderPage } from './glasses/display';
import { setupEventListeners } from './glasses/events';
import { restoreTimer, resyncTimer } from './timer';
import { renderCompanion } from './phone/companion';

function isEvenAppEnvironment(): boolean {
  return typeof (window as any).flutter_inappwebview !== 'undefined';
}

let restored = false;

// Settings first: a saved phase without durationMs (from 1.0.0) takes its length from them.
async function restoreSavedState() {
  if (restored) return;
  restored = true;
  const savedSettings = await loadSettings();
  if (savedSettings) setSettings(savedSettings);
  const saved = await loadTimerState();
  if (saved) restoreTimer(saved);
}

async function init() {
  if (!isEvenAppEnvironment()) {
    await restoreSavedState();
    renderCompanion(false);
    return;
  }

  try {
    const b = await waitForEvenAppBridge();
    setBridge(b);
    // Restore before the first render, so a relaunch (e.g. after Android
    // reclaimed the WebView) shows the saved session instead of a fresh one.
    await restoreSavedState();
    await renderPage();
    setupEventListeners();
    renderCompanion(true);
    // Android WebViews throttle or suspend setTimeout when the screen is off;
    // resync on unhide so the glasses display catches up immediately.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resyncTimer();
    });
  } catch (err) {
    console.error('[pomodoro] bridge init failed:', err);
    // The phone page still shows (and can change) the saved session and settings.
    await restoreSavedState().catch(() => {});
    renderCompanion(false);
  }
}

void init();
