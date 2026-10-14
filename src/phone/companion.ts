import { PHONE_POLL_MS, SETTINGS_LIMITS } from '../config';
import {
  settings, mode, running, alert, endsAt,
  completedInSet, isLongBreak, isPhaseUntouched, getAlertText,
  buildTimerText, progressFraction,
} from '../state';
import { toggleTimer, skipToNext, resetTimer, applySettings } from '../timer';
import { clampSettings } from '../storage';
import { t, formatClock } from '../i18n';

type SettingKey = keyof typeof SETTINGS_LIMITS;

// One tap of − / + moves a setting by this much; the long lengths step by 5
// so going from 25 to 50 minutes takes a few taps, not 25.
const SETTING_STEPS: Record<SettingKey, number> = {
  workMinutes: 5,
  shortBreakMinutes: 1,
  longBreakMinutes: 5,
  sessionsPerSet: 1,
};

const SETTING_ROWS: Array<{ key: SettingKey; label: string; format: (n: number) => string }> = [
  { key: 'workMinutes', label: t.phone.workLength, format: t.phone.minutes },
  { key: 'shortBreakMinutes', label: t.phone.shortBreakLength, format: t.phone.minutes },
  { key: 'longBreakMinutes', label: t.phone.longBreakLength, format: t.phone.minutes },
  { key: 'sessionsPerSet', label: t.phone.sessionsPerSet, format: String },
];

// Phone-side page shown in the Even app's WebView (and in a plain browser when
// developing). Mirrors the glasses state, offers the same actions and holds
// the timer settings, which the glasses have no room for.
export function renderCompanion(glassesConnected: boolean) {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <main class="companion">
      <header>
        <p class="label">${t.phone.title}</p>
        <h1 id="c-mode" class="title"></h1>
      </header>
      <section class="card timer-card">
        <p id="c-status" class="caption" aria-live="polite"></p>
        <p id="c-time" class="time" role="timer"></p>
        <div class="progress" role="progressbar" aria-label="${t.phone.progressLabel}" aria-valuemin="0" aria-valuemax="100">
          <div id="c-fill" class="progress-fill"></div>
        </div>
        <div class="timer-meta">
          <p id="c-dots" class="dots"></p>
          <p id="c-ends" class="caption dim" hidden></p>
        </div>
      </section>
      <div class="actions">
        <button id="c-toggle" class="button primary" type="button"></button>
        <button id="c-skip" class="button" type="button">${t.phone.skip}</button>
        <button id="c-reset" class="button" type="button">${t.phone.reset}</button>
      </div>
      <section id="c-settings" class="card settings">
        <h2 class="subtitle">${t.phone.settingsTitle}</h2>
        <div class="setting-list">
          ${SETTING_ROWS.map(({ key, label }) => `
            <div class="setting" role="group" aria-labelledby="l-${key}">
              <span id="l-${key}" class="setting-label">${label}</span>
              <div class="stepper">
                <button class="step" type="button" data-key="${key}" data-dir="-1" aria-label="${t.phone.decrease(label)}">−</button>
                <output id="s-${key}" class="step-value" aria-live="polite"></output>
                <button class="step" type="button" data-key="${key}" data-dir="1" aria-label="${t.phone.increase(label)}">+</button>
              </div>
            </div>`).join('')}
        </div>
        <p class="caption dim">${t.phone.settingsNote}</p>
      </section>
      <section class="card">
        <label class="setting" for="s-compactView">
          <span class="setting-text">
            <span class="setting-label">${t.phone.compactView}</span>
            <span class="caption dim">${t.phone.compactViewNote}</span>
          </span>
          <input id="s-compactView" class="switch" type="checkbox" role="switch">
        </label>
      </section>
      <section class="card help">
        <h2 class="subtitle">${t.phone.helpTitle}</h2>
        <dl class="gestures">
          ${t.phone.helpGestures.map(([gesture, action]) => `<dt>${gesture}</dt><dd>${action}</dd>`).join('')}
        </dl>
        <p class="caption dim">${t.phone.helpAlert}</p>
      </section>
      ${glassesConnected ? '' : `<p class="caption dim">${t.phone.preview}</p>`}
    </main>
  `;

  document.getElementById('c-toggle')?.addEventListener('click', () => toggleTimer());
  document.getElementById('c-skip')?.addEventListener('click', () => void skipToNext());
  document.getElementById('c-reset')?.addEventListener('click', () => void resetTimer());
  document.getElementById('c-settings')?.addEventListener('click', onStepperClick);
  document.getElementById('s-compactView')?.addEventListener('change', onCompactViewChange);

  syncPolling();
  document.addEventListener('visibilitychange', syncPolling);
}

// applySettings changes the state at once (saving and the glasses redraw are
// debounced), so the page shows the new value right away.
function onStepperClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-key]');
  if (!button || button.getAttribute('aria-disabled') === 'true') return;
  const key = button.dataset.key as SettingKey;
  const next = settings[key] + Number(button.dataset.dir) * SETTING_STEPS[key];
  applySettings(clampSettings({ ...settings, [key]: next }));
  update();
}

function onCompactViewChange(event: Event) {
  applySettings({ ...settings, compactView: (event.target as HTMLInputElement).checked });
  update();
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

function statusText(): string {
  if (alert) return getAlertText();
  if (running) return t.phone.running;
  return isPhaseUntouched() ? t.phone.ready : t.phone.paused;
}

function toggleLabel(): string {
  if (running) return t.phone.pause;
  return alert || isPhaseUntouched() ? t.phone.start : t.phone.resume;
}

function update() {
  setText('c-mode', mode === 'work' ? t.phone.work : isLongBreak() ? t.phone.longBreak : t.phone.shortBreak);
  setText('c-status', statusText());
  setText('c-time', buildTimerText());
  setText('c-dots', t.phone.sessions(completedInSet(), settings.sessionsPerSet));
  setText('c-toggle', toggleLabel());

  const ends = document.getElementById('c-ends');
  if (ends) {
    ends.hidden = !running;
    if (running) setText('c-ends', t.phone.endsAt(formatClock(endsAt)));
  }

  const pct = Math.round(progressFraction() * 100);
  const fill = document.getElementById('c-fill');
  if (fill) fill.style.width = `${pct}%`;
  fill?.parentElement?.setAttribute('aria-valuenow', String(pct));

  for (const { key, format } of SETTING_ROWS) {
    setText(`s-${key}`, format(settings[key]));
    const [min, max] = SETTINGS_LIMITS[key];
    // aria-disabled rather than disabled: a disabled button would drop keyboard focus at the limit.
    for (const button of document.querySelectorAll<HTMLButtonElement>(`button[data-key="${key}"]`)) {
      const atLimit = Number(button.dataset.dir) < 0 ? settings[key] <= min : settings[key] >= max;
      button.setAttribute('aria-disabled', String(atLimit));
    }
  }
  const compactView = document.getElementById('s-compactView') as HTMLInputElement | null;
  if (compactView) compactView.checked = settings.compactView;
}
