import './style.css';
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import { setBridge } from './state';
import { loadTimerState } from './storage';
import { renderPage } from './glasses/display';
import { setupEventListeners } from './glasses/events';
import { restoreTimer, resyncTimer } from './timer';
import { renderCompanion } from './phone/companion';

function isEvenAppEnvironment(): boolean {
  return typeof (window as any).flutter_inappwebview !== 'undefined';
}

async function restoreSavedState() {
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
    renderCompanion(false);
  }
}

void init();
