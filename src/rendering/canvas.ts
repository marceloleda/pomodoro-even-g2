const ON_THRESHOLD = 128;

// Thresholds to pure on/off pixels before encoding: the design guidelines ask
// for flat icons with no anti-aliasing, which also keeps edges crisp on the G2.
export function canvasToBytes(canvas: HTMLCanvasElement): number[] {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    for (let i = 0; i < px.length; i += 4) {
      const v = Math.max(px[i], px[i + 1], px[i + 2]) >= ON_THRESHOLD ? 255 : 0;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }
  const dataUrl = canvas.toDataURL('image/png');
  const binary = atob(dataUrl.split(',')[1]);
  const bytes: number[] = [];
  for (let i = 0; i < binary.length; i++) {
    bytes.push(binary.charCodeAt(i));
  }
  return bytes;
}

export function createCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get 2D canvas context');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  return { canvas, ctx };
}
