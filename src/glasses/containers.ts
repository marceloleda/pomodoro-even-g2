import {
  TextContainerProperty,
  ImageContainerProperty,
} from '@evenrealities/even_hub_sdk';
import {
  DISPLAY_WIDTH, PADDING, ICON_SIZE,
  PROGRESS_BAR_WIDTH, PROGRESS_BAR_HEIGHT,
} from '../config';
import { buildStatusLine, formatTime, timeLeft, buildSessionDots, buildMenuText } from '../state';

// Container IDs
export const ICON_ID = 1;
export const STATUS_ID = 2;
export const TIMER_ID = 3;
export const PBAR_IMG_ID = 4;
export const DOTS_ID = 5;
export const MENU_ID = 6;

export function buildContainers() {
  const iconImg = new ImageContainerProperty({
    xPosition: 4, yPosition: 4,
    width: ICON_SIZE, height: ICON_SIZE,
    containerID: ICON_ID, containerName: 'icon',
  });

  const statusText = new TextContainerProperty({
    xPosition: 90, yPosition: 0,
    width: 260, height: 30,
    containerID: STATUS_ID, containerName: 'status',
    content: buildStatusLine(),
    isEventCapture: 0, paddingLength: 4,
    borderWidth: 0, borderColor: 0,
  });

  const timerText = new TextContainerProperty({
    xPosition: 90, yPosition: 32,
    width: 260, height: 70,
    containerID: TIMER_ID, containerName: 'timer',
    content: formatTime(timeLeft),
    isEventCapture: 0, paddingLength: PADDING,
    borderWidth: 0, borderColor: 0,
  });

  const progressImg = new ImageContainerProperty({
    xPosition: 30, yPosition: 115,
    width: PROGRESS_BAR_WIDTH, height: PROGRESS_BAR_HEIGHT,
    containerID: PBAR_IMG_ID, containerName: 'pbar',
  });

  const dotsText = new TextContainerProperty({
    xPosition: 10, yPosition: 150,
    width: 340, height: 35,
    containerID: DOTS_ID, containerName: 'dots',
    content: buildSessionDots(),
    isEventCapture: 0, paddingLength: PADDING,
    borderWidth: 0, borderColor: 0,
  });

  const menuText = new TextContainerProperty({
    xPosition: 370, yPosition: 30,
    width: DISPLAY_WIDTH - 370, height: 240,
    containerID: MENU_ID, containerName: 'menu',
    content: buildMenuText(),
    isEventCapture: 1, paddingLength: PADDING,
    borderWidth: 0, borderColor: 0,
  });

  return { iconImg, statusText, timerText, progressImg, dotsText, menuText };
}
