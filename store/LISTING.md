# Store listing (Even Hub developer portal)

Copy-paste material for the portal, checked against the
[App Submission & QA Guidelines](https://hub.evenrealities.com/docs/ship/app-submission).

## Metadata

| Field | Value |
|---|---|
| Name | `Pomodoro` (must match `app.json` `name` and the on-glasses name) |
| Tagline | Focus timer with work/break cycles for Even G2. |
| Category | Productivity |
| Search tags | pomodoro, focus, timer, productivity, study (the portal allows 5) |
| Languages | English, Spanish, French, German, Italian, Chinese, Japanese, Korean (`en`, `es`, `fr`, `de`, `it`, `zh`, `ja`, `ko`) |

### Description

Stay focused with the Pomodoro technique, right in your line of sight.

- 25-minute work sessions, 5-minute short breaks and a 15-minute long break after every 4 sessions, all adjustable on the phone
- Tap on the temple or ring to start or pause; tap then hold for Skip and Reset
- See the time the current phase ends at
- The glasses can't play sounds, so when a phase ends the status line blinks and the timer counts the extra time until you start the next one
- Your session keeps running with the phone locked and is still there if you close and reopen the app
- Double-tap to exit

### Release notes (1.1.0)

One line per supported language, as the portal asks.

| Language | Notes |
|---|---|
| `en` | Tap to start or pause, with Skip and Reset in the tap-and-hold menu. Set your own work and break lengths on the phone, see when the phase ends and how long you've run over. Now in 8 languages. |
| `es` | Toca para iniciar o pausar; Saltar y Reiniciar están en el menú de tocar y mantener. Ajusta en el teléfono la duración del trabajo y de los descansos, y ve cuándo termina la fase y cuánto tiempo te has pasado. Ahora en 8 idiomas. |
| `fr` | Touchez pour démarrer ou mettre en pause ; Passer et Réinitialiser sont dans le menu toucher-maintenir. Réglez sur le téléphone la durée du travail et des pauses, et voyez quand la phase se termine et de combien vous l'avez dépassée. Désormais en 8 langues. |
| `de` | Tippen startet oder pausiert, Überspringen und Zurücksetzen liegen im Menü per Tippen und Halten. Stell die Länge von Arbeit und Pausen auf dem Handy ein und sieh, wann die Phase endet und wie lange du überzogen hast. Jetzt in 8 Sprachen. |
| `it` | Tocca per avviare o mettere in pausa; Salta e Azzera sono nel menu tocca e tieni premuto. Imposta dal telefono la durata del lavoro e delle pause, e vedi quando finisce la fase e quanto tempo sei andato oltre. Ora in 8 lingue. |
| `zh` | 轻点即可开始或暂停，跳过和重置位于轻点后按住打开的菜单中。可在手机上设置工作和休息时长，并查看阶段结束时间和超出的时间。现支持 8 种语言。 |
| `ja` | タップで開始・一時停止、スキップとリセットはタップ後の長押しで開くメニューから。作業と休憩の長さをスマホで設定でき、フェーズの終了時刻と超過時間も確認できます。8 言語に対応しました。 |
| `ko` | 탭하여 시작하거나 일시정지하고, 건너뛰기와 초기화는 탭 후 길게 눌러 여는 메뉴에서 할 수 있습니다. 휴대폰에서 작업과 휴식 시간을 설정하고, 단계가 끝나는 시각과 초과한 시간을 확인하세요. 이제 8개 언어를 지원합니다. |

The non-English lines and the in-app translations (`src/i18n/strings.ts`) were written without a native speaker; have each one reviewed before publishing.

### Release notes (1.0.0, `en`)

A Pomodoro focus timer for your glasses: work sessions, short and long breaks, and a blinking alert when it's time to switch. Your session keeps running with the phone locked or the app closed.

## Visual assets

- **Store icon:** `icon-24.png`, 24x24, 1-bit. Every lit pixel is part of a 2x2 block, as the portal validator requires. Redraw it in the portal's 24x24 editor using this grid (`#` = lit 2x2 block):

  ```
  .....##.....
  ..##.##.##..
  ...######...
  .##.####.##.
  ############
  ############
  ############
  ############
  ############
  .##########.
  ..########..
  ....####....
  ```

- **Cover:** the portal builds it from a screenshot placed over a stock environment photo (Office is used here); no separate background image is uploaded.
- **Screenshots:** `screenshots/*.png`, the raw 576x288 framebuffer from the simulator's screenshot API (the format the guidelines ask for):
  1. `1-work-running.png`: work session in progress
  2. `2-break-alert.png`: phase-end alert waiting for the user
  3. `3-long-break.png`: long break after a full set

## Privacy

The app requests no permissions, makes no network requests and collects no data. The only things it stores are the timer state (phase, session count, end time) and the timer settings (phase lengths, sessions per set), kept on the phone through the Even app's local storage so a session survives the app being closed. No backend services.

## Pre-submission checklist

From the [Beta Testing](https://hub.evenrealities.com/docs/test/beta-testing) guide. The simulator can't validate these; use a Beta build.

1. `npm run pack`, then `npx evenhub pack app.json dist -o pomodoro.ehpk -c --sdk-ver 0.0.16` to confirm the `package_id` is available.
2. Upload `pomodoro.ehpk` to the portal, push it to a Beta group with your account, install it from **Me → Beta tester**.
3. Start a timer, lock the phone for 5 minutes, unlock: the timer is still running with the right time, no spinner, no black screen.
   Let a short phase end with the phone locked: the alert blinks and the overtime counts up.
   Tap then hold: the menu shows Skip and Reset and both work; swipe: the footer shows the gestures.
   Double-tap and answer "No": the page comes back with the timer and the icon (the simulator can't show this dialog).
4. Double-tap on the glasses: the system exit dialog appears and the phone WebView closes on confirm.
5. After exiting, launch Conversate: it starts without restarting the glasses.
6. The Developer Mode console shows no errors at boot.
