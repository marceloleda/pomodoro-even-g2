import {
  TextContainerProperty,
  ImageContainerProperty,
  MenuContainerProperty,
  MenuItemProperty,
} from '@evenrealities/even_hub_sdk';
import {
  ICON_SIZE, TEXT_BRIGHT, TEXT_DIM, TEXT_PADDING, TEXT_ROW_HEIGHT,
  HEADER_X, HEADER_WIDTH, BODY_X, BODY_WIDTH,
  COMPACT_TIMER_X, COMPACT_TIMER_WIDTH, COMPACT_BAR_X, COMPACT_BAR_WIDTH, COMPACT_Y, BLANK_TEXT,
  MENU_SKIP_ID, MENU_RESET_ID,
} from '../config';
import {
  buildStatusLine, buildTimerText, buildCompactTimer, buildSessionDots, buildProgressBar, buildMiniBar, buildFooter,
} from '../state';
import { t } from '../i18n';

// Container IDs
export const ICON_ID = 1;
export const STATUS_ID = 2;
export const TIMER_ID = 3;
export const PROGRESS_ID = 4;
export const DOTS_ID = 5;
export const FOOTER_ID = 6;

export const CONTAINER_NAMES: Record<number, string> = {
  [STATUS_ID]: 'status', [TIMER_ID]: 'timer', [PROGRESS_ID]: 'progress', [DOTS_ID]: 'dots', [FOOTER_ID]: 'footer',
};

// The full page, or while a phase runs (if the setting is on) the compact one:
// "▶ 24:13" and a mini bar in the top-right corner, and a footer left blank but
// for the gesture hint. It has no icon.
export type PageView = 'full' | 'compact';

// The text rows of each page, with their brightness.
export const VIEW_ROWS: Record<PageView, ReadonlyMap<number, number>> = {
  full: new Map([
    [STATUS_ID, TEXT_BRIGHT], [TIMER_ID, TEXT_BRIGHT], [PROGRESS_ID, TEXT_BRIGHT], [DOTS_ID, TEXT_DIM], [FOOTER_ID, TEXT_DIM],
  ]),
  compact: new Map([[TIMER_ID, TEXT_DIM], [PROGRESS_ID, TEXT_DIM], [FOOTER_ID, TEXT_DIM]]),
};

export function rowText(containerID: number, view: PageView): string {
  const compact = view === 'compact';
  switch (containerID) {
    case STATUS_ID: return buildStatusLine();
    case TIMER_ID: return compact ? buildCompactTimer() : buildTimerText();
    case PROGRESS_ID: return compact ? buildMiniBar() : buildProgressBar();
    case DOTS_ID: return buildSessionDots();
    default: return compact ? BLANK_TEXT : buildFooter();
  }
}

const FOOTER_Y = 236;

// One text row: lines are 27px tall on the G2, and a container whose height
// minus padding is smaller than that overflows into a scrollbar.
function textRow(containerID: number, x: number, y: number, width: number, content: string, textColor: number) {
  return new TextContainerProperty({
    xPosition: x, yPosition: y,
    width, height: TEXT_ROW_HEIGHT,
    containerID, containerName: CONTAINER_NAMES[containerID],
    content, textColor,
    isEventCapture: 0, paddingLength: TEXT_PADDING,
    borderWidth: 0, borderColor: 0,
  });
}

// `maxLevel` caps every row's brightness, for a page that fades in.
export function buildPage(view: PageView, maxLevel = TEXT_BRIGHT) {
  const row = (containerID: number, x: number, y: number, width: number) => textRow(
    containerID, x, y, width, rowText(containerID, view), Math.min(maxLevel, VIEW_ROWS[view].get(containerID)!));

  // Skip and Reset live in the system contextual menu (tap then long press).
  // A rebuild without menuObject clears it, so every page carries it.
  const menuObject = new MenuContainerProperty({
    menuItems: [
      new MenuItemProperty({ itemName: t.glasses.menuSkip, itemID: MENU_SKIP_ID }),
      new MenuItemProperty({ itemName: t.glasses.menuReset, itemID: MENU_RESET_ID }),
    ],
  });

  // The timer row takes the input: a tap starts or pauses, so the page needs no
  // on-screen menu. Its text never wraps, so the firmware has nothing to scroll.
  const compact = view === 'compact';
  const timerText = compact
    ? row(TIMER_ID, COMPACT_TIMER_X, COMPACT_Y, COMPACT_TIMER_WIDTH)
    : row(TIMER_ID, HEADER_X, 58, HEADER_WIDTH);
  timerText.isEventCapture = 1;

  if (compact) {
    const textObject = [
      timerText,
      row(PROGRESS_ID, COMPACT_BAR_X, COMPACT_Y, COMPACT_BAR_WIDTH),
      row(FOOTER_ID, BODY_X, FOOTER_Y, BODY_WIDTH),
    ];
    return { containerTotalNum: textObject.length, textObject, menuObject };
  }

  const iconImg = new ImageContainerProperty({
    xPosition: 20, yPosition: 24,
    width: ICON_SIZE, height: ICON_SIZE,
    containerID: ICON_ID, containerName: 'icon',
  });

  const textObject = [
    row(STATUS_ID, HEADER_X, 18, HEADER_WIDTH),
    timerText,
    row(PROGRESS_ID, BODY_X, 124, BODY_WIDTH),
    row(DOTS_ID, BODY_X, 168, BODY_WIDTH),
    row(FOOTER_ID, BODY_X, FOOTER_Y, BODY_WIDTH),
  ];

  return {
    containerTotalNum: 1 + textObject.length,
    imageObject: [iconImg],
    textObject,
    menuObject,
  };
}
