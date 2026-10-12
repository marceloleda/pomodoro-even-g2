import { LANGUAGES, STRINGS, type Lang } from './strings';

// Same rule as the Even Hub runtime: the device language if the app supports
// it, otherwise the first language listed. `?lang=xx` overrides it, so the
// simulator can be pointed at any translation.
function pickLanguage(): Lang {
  const requested = [new URLSearchParams(location.search).get('lang') ?? '', ...navigator.languages];
  for (const tag of requested) {
    const code = tag.toLowerCase().split('-')[0];
    const match = LANGUAGES.find((l) => l === code);
    if (match) return match;
  }
  return LANGUAGES[0];
}

export const lang = pickLanguage();
export const t = STRINGS[lang];
document.documentElement.lang = lang;

// Clock time in the device locale's usual format (24h or 12h; the phone's own
// 12/24h switch isn't visible to a WebView), with Latin digits and plain
// spaces: the G2 fonts have no glyph for the narrow no-break space some
// locales put before AM/PM, and a missing glyph is silently dropped.
export function formatClock(ms: number): string {
  return new Date(ms)
    .toLocaleTimeString(navigator.language, { hour: 'numeric', minute: '2-digit', numberingSystem: 'latn' })
    .replace(/[\u00a0\u202f]/g, ' ');
}
