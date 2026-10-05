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
| Languages | English (`en`) |

### Description

Stay focused with the Pomodoro technique, right in your line of sight.

- 25-minute work sessions, 5-minute short breaks and a 15-minute long break after every 4 sessions
- Swipe on the temple or ring to choose Start / Pause, Skip or Reset, and tap to confirm
- The glasses can't play sounds, so when a phase ends the status line blinks and the timer waits until you start the next one
- Your session keeps running with the phone locked and is still there if you close and reopen the app
- Double-tap to exit

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

The app requests no permissions, makes no network requests and collects no data. The only thing it stores is the timer state (phase, session count, end time), kept on the phone through the Even app's local storage so a session survives the app being closed. No backend services.

## Pre-submission checklist

From the [Beta Testing](https://hub.evenrealities.com/docs/test/beta-testing) guide. The simulator can't validate these; use a Beta build.

1. `npm run pack`, then `npx evenhub pack app.json dist -o pomodoro.ehpk -c --sdk-ver 0.0.16` to confirm the `package_id` is available.
2. Upload `pomodoro.ehpk` to the portal, push it to a Beta group with your account, install it from **Me → Beta tester**.
3. Start a timer, lock the phone for 5 minutes, unlock: the timer is still running with the right time, no spinner, no black screen.
4. Double-tap on the glasses: the system exit dialog appears and the phone WebView closes on confirm.
5. After exiting, launch Conversate: it starts without restarting the glasses.
6. The Developer Mode console shows no errors at boot.
