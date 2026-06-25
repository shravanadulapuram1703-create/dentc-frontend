import type { Stroke } from './DrawLayer';

/** Rasterize normalized (0–1000) strokes to a transparent PNG blob at w×h px. */
export async function strokesToPngBlob(strokes: Stroke[], w: number, h: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const st of strokes) {
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.width;
    ctx.beginPath();
    st.pts.forEach((p, i) => {
      const x = (p[0] / 1000) * canvas.width;
      const y = (p[1] / 1000) * canvas.height;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}
