import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Minimize2, Target as TargetIcon } from 'lucide-react';
import type { TargetData } from '../types';

interface SkyCanvasViewProps {
  target: TargetData;
  onToggleSplitMode: () => void;
}

export function SkyCanvasView({
  target,
  onToggleSplitMode,
}: SkyCanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.015;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#020306';
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.44;
      const cy = h * 0.48;

      // Draw celestial background dust and dense starfield (matching Image 2)
      for (let i = 0; i < 320; i += 1) {
        const sx = ((Math.sin(i * 12.9898 + target.raDeg * 0.1) * 43758.5453) % 1) * w;
        const sy = ((Math.sin(i * 78.233 + target.decDeg * 0.1) * 24634.6345) % 1) * h;
        const baseR = (i % 7 === 0) ? 1.6 : (i % 3 === 0) ? 1.1 : 0.65;
        const twinkle = 0.25 + 0.65 * ((Math.sin(i * 3 + t) + 1) / 2);

        // Warm and blue hues
        const starColor =
          i % 9 === 0
            ? 'rgba(255, 200, 140, '
            : i % 5 === 0
              ? 'rgba(165, 215, 255, '
              : 'rgba(255, 255, 255, ';

        ctx.fillStyle = `${starColor}${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, baseR, 0, Math.PI * 2);
        ctx.fill();

        // Diffraction spikes for few bright stars
        if (i % 35 === 0) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${twinkle * 0.4})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(sx - 12, sy);
          ctx.lineTo(sx + 12, sy);
          ctx.moveTo(sx, sy - 12);
          ctx.lineTo(sx, sy + 12);
          ctx.stroke();
        }
      }

      // Faint background celestial coordinate lines / constellation lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 60; x < w; x += 180) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 60; y < h; y += 180) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // TARGET LOCK RETICLE (matching Image 2 with animated cyan pulse)
      const pulse = 1 + Math.sin(t * 3) * 0.08;

      // Glow behind target lock
      const targetGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 42 * pulse);
      targetGlow.addColorStop(0, 'rgba(34, 211, 238, 0.45)');
      targetGlow.addColorStop(0.5, 'rgba(34, 211, 238, 0.12)');
      targetGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = targetGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 42 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Central target star
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner cyan circle
      ctx.strokeStyle = '#22D3EE';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair arms
      const armLen = 38;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - armLen, cy);
      ctx.lineTo(cx - 20, cy);
      ctx.moveTo(cx + 20, cy);
      ctx.lineTo(cx + armLen, cy);
      ctx.moveTo(cx, cy - armLen);
      ctx.lineTo(cx, cy - 20);
      ctx.moveTo(cx, cy + 20);
      ctx.lineTo(cx, cy + armLen);
      ctx.stroke();

      // Outer reticle corner brackets
      const bDist = 26;
      const bArm = 8;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // TL
      ctx.moveTo(cx - bDist, cy - bDist + bArm);
      ctx.lineTo(cx - bDist, cy - bDist);
      ctx.lineTo(cx - bDist + bArm, cy - bDist);
      // TR
      ctx.moveTo(cx + bDist - bArm, cy - bDist);
      ctx.lineTo(cx + bDist, cy - bDist);
      ctx.lineTo(cx + bDist, cy - bDist + bArm);
      // BR
      ctx.moveTo(cx + bDist, cy + bDist - bArm);
      ctx.lineTo(cx + bDist, cy + bDist);
      ctx.lineTo(cx + bDist - bArm, cy + bDist);
      // BL
      ctx.moveTo(cx - bDist + bArm, cy + bDist);
      ctx.lineTo(cx - bDist, cy + bDist);
      ctx.lineTo(cx - bDist, cy + bDist - bArm);
      ctx.stroke();

      // Target Label & Star Icon (matching Image 2: "★ WISE 0855")
      ctx.font = '600 13px "Inter", sans-serif';
      ctx.fillStyle = '#22D3EE';
      ctx.fillText(`★ ${target.name}`, cx - 80, cy + 55);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [target]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportFile = () => {
    const data = JSON.stringify(target, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spherex-${target.id}-observation.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top-left: Switch to Split Mode button & Title matching Image 2 */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSplitMode}
          title="Regresar a Vista Dividida (Foto / 3D Model)"
          className="p-2 rounded-lg bg-[#121622]/80 hover:bg-[#1C2234] border border-white/10 hover:border-cyan-400/50 text-neutral-300 hover:text-white backdrop-blur-md transition-all shadow-md"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-medium tracking-wide text-neutral-200 drop-shadow">
          SPHEREx Sky Canvas
        </span>
      </div>

      {/* Target Lock Tooltip Badge (matching Image 2: cyan rounded pill near crosshair) */}
      <div className="absolute top-[48%] left-[44%] -translate-y-1/2 translate-x-12 z-20 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/60 text-cyan-200 text-xs font-medium backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.35)] animate-pulse">
          <TargetIcon className="w-3 h-3 text-cyan-400" />
          <span>Target Lock</span>
        </div>
      </div>

      {/* Floating Quick Actions Bar (Top-Right of canvas, matching Image 2) */}
      <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10141E]/80 border border-white/10 backdrop-blur-md shadow-xl text-xs">
        <span className="text-neutral-400 font-mono text-[11px] pr-1">
          Quick Actions:
        </span>
        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex items-center gap-1 text-neutral-200 hover:text-cyan-300 px-2 py-0.5 rounded hover:bg-white/5 transition-colors font-medium"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied!' : 'Copy Share URL'}</span>
        </button>
        <span className="text-white/20">|</span>
        <button
          type="button"
          onClick={handleExportFile}
          className="flex items-center gap-1 text-neutral-200 hover:text-cyan-300 px-2 py-0.5 rounded hover:bg-white/5 transition-colors font-medium"
        >
          {exported ? <Check className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3" />}
          <span>{exported ? 'Exported!' : 'Export Find File'}</span>
        </button>
      </div>

      {/* Floating Quick Actions Pill (Bottom-Right of canvas, matching Image 2) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#10141E]/85 border border-white/10 backdrop-blur-md shadow-2xl text-xs">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white transition-all font-medium"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Share URL</span>
          </button>
          <button
            type="button"
            onClick={handleExportFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white transition-all font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Find File</span>
          </button>
        </div>
      </div>
    </div>
  );
}
