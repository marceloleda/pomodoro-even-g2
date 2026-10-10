import { CYCLES_BEFORE_LONG_BREAK, PHONE_POLL_MS } from '../config';
import {
  running, alert, mode, completedInSet, isLongBreak,
  formatTime, secondsLeft, progressFraction,
} from '../state';
import { toggleTimer, skipToNext, resetTimer } from '../timer';

// Phone-side page shown in the Even app's WebView (and in a plain browser when
// developing). Mirrors the glasses state and offers the same three actions.
export function renderCompanion(glassesConnected: boolean) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <main class="companion">
      <header>
        <p class="label">Pomodoro</p>
        <h1 id="c-mode" class="title"></h1>
      </header>
      <section class="card timer-card" aria-live="polite">
        <p id="c-status" class="caption"></p>
        <p id="c-time" class="time"></p>
        <div class="progress" role="progressbar" aria-label="Phase progress" aria-valuemin="0" aria-valuemax="100">
          <div id="c-fill" class="progress-fill"></div>
        </div>
        <p id="c-dots" class="dots" aria-label="Completed sessions"></p>
      </section>
      <div class="actions">
        <button id="c-toggle" class="button primary" type="button"></button>
        <button id="c-skip" class="button" type="button">Skip</button>
        <button id="c-reset" class="button" type="button">Reset</button>
      </div>
      <section class="card help">
        <h2 class="subtitle">On your glasses</h2>
        <ul>
          <li><strong>Swipe</strong> to choose Start / Pause, Skip or Reset</li>
          <li><strong>Tap</strong> to confirm</li>
          <li><strong>Double-tap</strong> to exit</li>
        </ul>
        <p class="caption dim">The glasses can't play sounds, so when a phase ends the status line blinks and the timer waits for you to start the next one.</p>
      </section>
      ${glassesConnected ? '' : '<p class="caption dim">Browser preview: glasses not connected.</p>'}
    </main>
  `;

  document.getElementById('c-toggle')?.addEventListener('click', () => toggleTimer());
  document.getElementById('c-skip')?.addEventListener('click', () => void skipToNext());
  document.getElementById('c-reset')?.addEventListener('click', () => void resetTimer());

  syncPolling();
  document.addEventListener('visibilitychange', syncPolling);
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

// Nobody sees the page while the phone is locked or the Even app is in the
// background, so polling stops there and catches up as soon as it is visible.
function syncPolling() {
  const visible = document.visibilityState === 'visible';
  if (visible && !pollTimer) {
    update();
    pollTimer = setInterval(update, PHONE_POLL_MS);
  } else if (!visible && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
}

function update() {
  setText('c-mode', mode === 'work' ? 'Work' : isLongBreak() ? 'Long break' : 'Short break');
  setText('c-status', alert || (running ? 'Running' : 'Paused'));
  setText('c-time', formatTime(secondsLeft()));
  setText('c-dots', `${completedInSet()} of ${CYCLES_BEFORE_LONG_BREAK} sessions`);

  const progress = progressFraction();
  setText('c-toggle', running ? 'Pause' : progress > 0 ? 'Resume' : 'Start');

  const pct = Math.round(progress * 100);
  const fill = document.getElementById('c-fill');
  if (fill) fill.style.width = `${pct}%`;
  fill?.parentElement?.setAttribute('aria-valuenow', String(pct));
}
