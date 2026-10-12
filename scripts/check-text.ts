// Checks every glasses string, in every language, against the G2 firmware fonts
// with @evenrealities/pretext: it must fit its one-line container (a wrapped
// line makes the firmware draw a scrollbar) and use glyphs the fonts have (a
// missing glyph is silently dropped). Run with `npm run check:text`.
import { getAdvW, measureTextWrap } from '@evenrealities/pretext';
import {
  TEXT_PADDING, HEADER_WIDTH, BODY_WIDTH, PROGRESS_SEGMENTS, SETTINGS_LIMITS, OVERTIME_MAX_MS,
} from '../src/config.ts';
import { LANGUAGES, STRINGS } from '../src/i18n/strings.ts';

const MENU_ITEM_MAX_BYTES = 32;
const headerInner = HEADER_WIDTH - 2 * TEXT_PADDING;
const bodyInner = BODY_WIDTH - 2 * TEXT_PADDING;
const maxSessions = SETTINGS_LIMITS.sessionsPerSet[1];
const longestDuration = '90:00';
const overtimeMaxMinutes = Math.floor(OVERTIME_MAX_MS / 60_000);
const longestOvertime = `+${overtimeMaxMinutes}:${String((OVERTIME_MAX_MS / 1000) % 60).padStart(2, '0')}`;

// formatClock (src/i18n/index.ts) uses the device locale, which can be any of
// these whatever the app language is; the widest result is what counts.
const CLOCK_LOCALES = ['en-US', 'de-DE', 'fr-FR', 'es-ES', 'it-IT', 'pt-BR', 'zh-CN', 'ja-JP', 'ko-KR'];
const clockSamples = CLOCK_LOCALES.flatMap((locale) =>
  [0, 1, 12, 13, 23].map((hour) => new Date(2026, 0, 1, hour, 59)).map((d) =>
    d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' })
      .replace(/[\u00a0\u202f]/g, ' ')));

const problems: string[] = [];

function checkLine(lang: string, what: string, text: string, innerWidth: number) {
  const missing = [...new Set([...text].filter((c) => c !== ' ' && getAdvW(c.codePointAt(0)!) === 0))];
  if (missing.length) problems.push(`${lang} ${what}: no glyph for ${missing.join(' ')} in "${text}"`);
  const { lineCount, lineWidths } = measureTextWrap(text, innerWidth);
  if (lineCount > 1) problems.push(`${lang} ${what}: wraps (${lineWidths.join('+')}px > ${innerWidth}px) "${text}"`);
}

checkLine('all', 'progress bar', '━'.repeat(PROGRESS_SEGMENTS), bodyInner);
checkLine('all', 'session dots', Array(maxSessions).fill('●').join(' '), bodyInner);
checkLine('all', 'timer', longestOvertime, headerInner);

for (const lang of LANGUAGES) {
  const g = STRINGS[lang].glasses;
  for (const [key, label] of Object.entries({ work: g.work, shortBreak: g.shortBreak, longBreak: g.longBreak })) {
    for (const icon of ['▶', '| |']) {
      checkLine(lang, `status ${key}`, `${icon}  ${label} · ${maxSessions}/${maxSessions}`, headerInner);
    }
  }
  for (const [key, alert] of Object.entries({ alertWork: g.alertWork, alertBreak: g.alertBreak, alertLongBreak: g.alertLongBreak })) {
    checkLine(lang, key, `★ ${alert}`, headerInner);
  }
  for (const clock of clockSamples) checkLine(lang, 'endsAt', g.endsAt(clock), bodyInner);
  checkLine(lang, 'tapToStart', g.tapToStart, bodyInner);
  checkLine(lang, 'tapToResume', g.tapToResume, bodyInner);
  checkLine(lang, 'tapToStartNext', g.tapToStartNext(longestDuration), bodyInner);
  checkLine(lang, 'gestureHint', g.gestureHint, bodyInner);
  for (const [key, item] of Object.entries({ menuSkip: g.menuSkip, menuReset: g.menuReset })) {
    const bytes = new TextEncoder().encode(item).length;
    if (bytes > MENU_ITEM_MAX_BYTES) problems.push(`${lang} ${key}: ${bytes} bytes > ${MENU_ITEM_MAX_BYTES} "${item}"`);
    checkLine(lang, key, item, bodyInner);
  }
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`check:text: all glasses strings fit in ${LANGUAGES.join(', ')}`);
