import './style.css';
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import { setBridge } from './state';
import { renderPage } from './glasses/display';
import { setupEventListeners } from './glasses/events';
import { isEvenAppEnvironment, renderWebPreview } from './web-preview/preview';

async function init() {
  if (!isEvenAppEnvironment()) {
    renderWebPreview();
    return;
  }

  try {
    const b = await waitForEvenAppBridge();
    setBridge(b);
    await renderPage();
    setupEventListeners();
  } catch (err) {
    console.error('[pomodoro] bridge init failed:', err);
    renderWebPreview();
  }
}

init();
