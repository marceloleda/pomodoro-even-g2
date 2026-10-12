import {
  TextContainerProperty,
  ImageContainerProperty,
  MenuContainerProperty,
  MenuItemProperty,
} from '@evenrealities/even_hub_sdk';
import {
  ICON_SIZE, TEXT_BRIGHT, TEXT_DIM, TEXT_PADDING, TEXT_ROW_HEIGHT,
  HEADER_X, HEADER_WIDTH, BODY_X, BODY_WIDTH, MENU_SKIP_ID, MENU_RESET_ID,
} from '../config';
import { buildStatusLine, buildTimerText, buildSessionDots, buildProgressBar, buildFooter } from '../state';
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

export function buildPage() {
  const iconImg = new ImageContainerProperty({
    xPosition: 20, yPosition: 24,
    width: ICON_SIZE, height: ICON_SIZE,
    containerID: ICON_ID, containerName: 'icon',
  });

  // The timer row takes the input: a tap starts or pauses, so the page needs no
  // on-screen menu. Its text never wraps, so the firmware has nothing to scroll.
  const timerText = textRow(TIMER_ID, HEADER_X, 58, HEADER_WIDTH, buildTimerText(), TEXT_BRIGHT);
  timerText.isEventCapture = 1;

  const textObject = [
    textRow(STATUS_ID, HEADER_X, 18, HEADER_WIDTH, buildStatusLine(), TEXT_BRIGHT),
    timerText,
    textRow(PROGRESS_ID, BODY_X, 124, BODY_WIDTH, buildProgressBar(), TEXT_BRIGHT),
    textRow(DOTS_ID, BODY_X, 168, BODY_WIDTH, buildSessionDots(), TEXT_DIM),
    textRow(FOOTER_ID, BODY_X, 236, BODY_WIDTH, buildFooter(), TEXT_DIM),
  ];

  // Skip and Reset live in the system contextual menu (tap then long press).
  // A rebuild without menuObject clears it, so every page carries it.
  const menuObject = new MenuContainerProperty({
    menuItems: [
      new MenuItemProperty({ itemName: t.glasses.menuSkip, itemID: MENU_SKIP_ID }),
      new MenuItemProperty({ itemName: t.glasses.menuReset, itemID: MENU_RESET_ID }),
    ],
  });

  return {
    containerTotalNum: 1 + textObject.length,
    imageObject: [iconImg],
    textObject,
    menuObject,
  };
}
