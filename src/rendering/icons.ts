import { createCanvas, canvasToBytes } from './canvas';

const LEAF_ANGLES = [-1.2, -0.55, 0, 0.55, 1.2];

// Cache icons since they never change
const iconCache = new Map<string, number[]>();

export function getTomatoIcon(size: number): number[] {
  const key = `tomato-${size}`;
  if (!iconCache.has(key)) iconCache.set(key, drawTomatoIcon(size));
  return iconCache.get(key)!;
}

export function getCoffeeIcon(size: number): number[] {
  const key = `coffee-${size}`;
  if (!iconCache.has(key)) iconCache.set(key, drawCoffeeIcon(size));
  return iconCache.get(key)!;
}

function drawTomatoIcon(size: number): number[] {
  const { canvas, ctx } = createCanvas(size, size);
  const centerX = size / 2;
  const bodyY = size * 0.56;
  const rx = size * 0.42;
  const ry = size * 0.33;
  const lineWidth = Math.max(2, size / 25);

  // Body: solid bright fill, dark outline
  ctx.fillStyle = '#ddd';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.ellipse(centerX, bodyY, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Calyx: 5 bold leaf petals
  const leafBase = bodyY - ry + 3;
  const leafLen = size * 0.2;
  const leafW = size * 0.08;

  // Fill
  ctx.fillStyle = '#ccc';
  for (const angle of LEAF_ANGLES) {
    ctx.save();
    ctx.translate(centerX, leafBase);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-leafW, -leafLen * 0.5, 0, -leafLen);
    ctx.quadraticCurveTo(leafW, -leafLen * 0.5, 0, 2);
    ctx.fill();
    ctx.restore();
  }

  // Outline
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  for (const angle of LEAF_ANGLES) {
    ctx.save();
    ctx.translate(centerX, leafBase);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.quadraticCurveTo(-leafW, -leafLen * 0.5, 0, -leafLen);
    ctx.quadraticCurveTo(leafW, -leafLen * 0.5, 0, 2);
    ctx.stroke();
    ctx.restore();
  }

  // Stem
  ctx.fillStyle = '#aaa';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  const stemH = size * 0.1;
  ctx.beginPath();
  ctx.moveTo(centerX - 3, leafBase);
  ctx.lineTo(centerX - 2, leafBase - stemH);
  ctx.lineTo(centerX + 2, leafBase - stemH);
  ctx.lineTo(centerX + 3, leafBase);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  return canvasToBytes(canvas);
}

function drawCoffeeIcon(size: number): number[] {
  const { canvas, ctx } = createCanvas(size, size);
  const lineWidth = Math.max(2, size / 25);

  const cupL = size * 0.15;
  const cupR = size * 0.65;
  const cupTop = size * 0.38;
  const cupBot = size * 0.78;
  const taper = size * 0.03;

  // Cup body (tapered)
  ctx.fillStyle = '#ddd';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(cupL, cupTop);
  ctx.lineTo(cupL + taper, cupBot);
  ctx.lineTo(cupR - taper, cupBot);
  ctx.lineTo(cupR, cupTop);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rim
  ctx.fillStyle = '#eee';
  ctx.fillRect(cupL - 2, cupTop - 3, cupR - cupL + 4, 5);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cupL - 2, cupTop - 3, cupR - cupL + 4, 5);

  // Handle
  const handleX = cupR + 2;
  const handleCy = (cupTop + cupBot) / 2;
  const handleR = size * 0.1;
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = lineWidth * 1.5;
  ctx.beginPath();
  ctx.arc(handleX, handleCy, handleR, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(handleX, handleCy, handleR + lineWidth * 0.5, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(handleX, handleCy, handleR - lineWidth * 0.5, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();

  // Saucer
  ctx.fillStyle = '#bbb';
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(size * 0.42, cupBot + 4, size * 0.38, size * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Steam
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const sx = cupL + size * 0.1 + i * size * 0.13;
    const steamH = size * 0.15 + i * 2;
    ctx.beginPath();
    ctx.moveTo(sx, cupTop - 6);
    ctx.quadraticCurveTo(sx + 5, cupTop - 6 - steamH * 0.5, sx, cupTop - 6 - steamH);
    ctx.stroke();
  }

  return canvasToBytes(canvas);
}
