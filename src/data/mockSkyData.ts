/**
 * Mock Sky Deep-Field Fallback Generator (Smooth Nebulosity & Galactic Glow).
 * Used as an instant zero-latency base layer underneath the live CDS HiPS2FITS astronomical cutout API.
 */

export function drawMockDeepSkyField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  zoomFactor: number,
  _targetPreset: string = 'default',
  isDiffMode: boolean = false,
) {
  if (isDiffMode) {
    ctx.fillStyle = 'rgba(8, 9, 12, 0.85)';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  ctx.save();

  // 1. Subtle Ambient Cosmic Infrared Glow
  const ambientGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.65);
  ambientGrad.addColorStop(0, 'rgba(32, 35, 44, 0.35)');
  ambientGrad.addColorStop(0.45, 'rgba(18, 20, 26, 0.2)');
  ambientGrad.addColorStop(1, 'rgba(8, 9, 12, 0)');
  ctx.fillStyle = ambientGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Smooth Diffuse Stellar Core Halo (No dotted beads)
  const haloRadius = Math.min(w, h) * 0.28 * Math.min(zoomFactor, 1.8);
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius);
  coreGrad.addColorStop(0, 'rgba(255, 244, 228, 0.42)');
  coreGrad.addColorStop(0.22, 'rgba(210, 198, 182, 0.16)');
  coreGrad.addColorStop(0.55, 'rgba(120, 130, 148, 0.05)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
