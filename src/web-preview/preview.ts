import { DISPLAY_WIDTH, DISPLAY_HEIGHT, CYCLES_BEFORE_LONG_BREAK, WEB_PREVIEW_POLL_MS } from '../config';
import { formatTime, timeLeft, getModeLabel, cycle, buildSessionDots, getTotalTime } from '../state';
import { startTimer, pauseTimer, resetTimer, skipToNext } from '../timer';

export function isEvenAppEnvironment(): boolean {
  return typeof (window as any).flutter_inappwebview !== 'undefined';
}

export function renderWebPreview() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <div style="
      width: ${DISPLAY_WIDTH}px; height: ${DISPLAY_HEIGHT}px;
      background: #000; color: #0f0;
      font-family: monospace;
      display: flex; gap: 40px;
      align-items: center; justify-content: center;
      border: 1px solid #0f03; border-radius: 8px;
      margin: 40px auto; padding: 20px;
    ">
      <div style="flex:1;">
        <div id="web-status" style="font-size: 13px; opacity:0.7;"></div>
        <div id="web-timer" style="font-size: 64px; font-weight: bold; margin: 8px 0;"></div>
        <div id="web-progress" style="height:12px;background:#333;border-radius:6px;margin:8px 0;overflow:hidden;">
          <div id="web-fill" style="height:100%;background:#0f0;border-radius:6px;width:0%;transition:width 0.5s;"></div>
        </div>
        <div id="web-dots" style="font-size: 16px; margin-top: 10px; letter-spacing: 4px;"></div>
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <button id="btn-start" style="background:transparent;color:#0f0;border:1px solid #0f04;padding:8px 20px;cursor:pointer;font-family:monospace;text-align:left;">Start</button>
        <button id="btn-pause" style="background:transparent;color:#0f0;border:1px solid #0f04;padding:8px 20px;cursor:pointer;font-family:monospace;text-align:left;">Pause</button>
        <button id="btn-reset" style="background:transparent;color:#0f0;border:1px solid #0f04;padding:8px 20px;cursor:pointer;font-family:monospace;text-align:left;">Reset</button>
        <button id="btn-skip" style="background:transparent;color:#0f0;border:1px solid #0f04;padding:8px 20px;cursor:pointer;font-family:monospace;text-align:left;">Skip</button>
      </div>
    </div>
  `;

  document.getElementById('btn-start')?.addEventListener('click', startTimer);
  document.getElementById('btn-pause')?.addEventListener('click', pauseTimer);
  document.getElementById('btn-reset')?.addEventListener('click', () => void resetTimer());
  document.getElementById('btn-skip')?.addEventListener('click', () => void skipToNext());

  setInterval(() => {
    const timerEl = document.getElementById('web-timer');
    const statusEl = document.getElementById('web-status');
    const fillEl = document.getElementById('web-fill');
    const dotsEl = document.getElementById('web-dots');

    if (timerEl) timerEl.textContent = formatTime(timeLeft);
    if (statusEl) statusEl.textContent = `${getModeLabel()} \u00B7 Cycle ${cycle}/${CYCLES_BEFORE_LONG_BREAK}`;
    if (fillEl) {
      const total = getTotalTime();
      const pct = Math.min(100, ((total - timeLeft) / Math.max(1, total)) * 100);
      fillEl.style.width = `${pct}%`;
    }
    if (dotsEl) dotsEl.textContent = buildSessionDots();
  }, WEB_PREVIEW_POLL_MS);
}
