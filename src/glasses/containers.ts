import {
  TextContainerProperty,
  ImageContainerProperty,
  ListContainerProperty,
  ListItemContainerProperty,
} from '@evenrealities/even_hub_sdk';
import { ICON_SIZE, MENU_ITEMS, TEXT_BRIGHT, TEXT_DIM } from '../config';
import { buildStatusLine, formatTime, secondsLeft, buildSessionDots, buildProgressBar } from '../state';

// Text lines are 27px tall on the G2; a container whose height minus padding is
// smaller than that overflows and the firmware draws a scrollbar beside it.
const TEXT_PADDING = 4;
const TEXT_ROW_HEIGHT = 40;

// Container IDs
export const ICON_ID = 1;
export const STATUS_ID = 2;
export const TIMER_ID = 3;
export const PROGRESS_ID = 4;
export const DOTS_ID = 5;
export const MENU_ID = 6;

export function buildContainers() {
  const iconImg = new ImageContainerProperty({
    xPosition: 20, yPosition: 24,
    width: ICON_SIZE, height: ICON_SIZE,
    containerID: ICON_ID, containerName: 'icon',
  });

  const statusText = new TextContainerProperty({
    xPosition: 116, yPosition: 18,
    width: 260, height: TEXT_ROW_HEIGHT,
    containerID: STATUS_ID, containerName: 'status',
    content: buildStatusLine(), textColor: TEXT_BRIGHT,
    isEventCapture: 0, paddingLength: TEXT_PADDING,
    borderWidth: 0, borderColor: 0,
  });

  const timerText = new TextContainerProperty({
    xPosition: 116, yPosition: 58,
    width: 260, height: TEXT_ROW_HEIGHT,
    containerID: TIMER_ID, containerName: 'timer',
    content: formatTime(secondsLeft()), textColor: TEXT_BRIGHT,
    isEventCapture: 0, paddingLength: TEXT_PADDING,
    borderWidth: 0, borderColor: 0,
  });

  const progressText = new TextContainerProperty({
    xPosition: 14, yPosition: 124,
    width: 362, height: TEXT_ROW_HEIGHT,
    containerID: PROGRESS_ID, containerName: 'progress',
    content: buildProgressBar(), textColor: TEXT_BRIGHT,
    isEventCapture: 0, paddingLength: TEXT_PADDING,
    borderWidth: 0, borderColor: 0,
  });

  const dotsText = new TextContainerProperty({
    xPosition: 14, yPosition: 168,
    width: 362, height: TEXT_ROW_HEIGHT,
    containerID: DOTS_ID, containerName: 'dots',
    content: buildSessionDots(), textColor: TEXT_DIM,
    isEventCapture: 0, paddingLength: TEXT_PADDING,
    borderWidth: 0, borderColor: 0,
  });

  // A native list: the firmware moves the highlight on swipes without a
  // Bluetooth round-trip, and a click reports the selected index.
  const menuList = new ListContainerProperty({
    xPosition: 392, yPosition: 44,
    width: 172, height: 160,
    containerID: MENU_ID, containerName: 'menu',
    isEventCapture: 1, paddingLength: 4,
    borderWidth: 0, borderColor: 0,
    itemContainer: new ListItemContainerProperty({
      itemCount: MENU_ITEMS.length,
      itemWidth: 0,
      isItemSelectBorderEn: 1,
      itemName: [...MENU_ITEMS],
    }),
  });

  return { iconImg, statusText, timerText, progressText, dotsText, menuList };
}
