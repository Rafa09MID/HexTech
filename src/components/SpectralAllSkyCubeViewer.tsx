import { useEffect, useRef, useState } from 'react';
import { Box, Layers, Pause, Play, Rotate3d } from 'lucide-react';
import type { TargetCatalogEntry } from '../types/spherex';

interface SpectralAllSkyCubeViewerProps {
  target: TargetCatalogEntry;
  activeWavelengthUm?: number;
  onSelectWavelength?: (um: number) => void;
}

export function SpectralAllSkyCubeViewer({
  target,
  activeWavelengthUm: _activeWavelengthUm = 2.42,
  onSelectWavelength,
}: SpectralAllSkyCubeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sliceIndex, setSliceIndex] = useState(51); // 0 to 101 channels
  const [isRotating, setIsRotating] = useState(true);
  const [rotAngle, setRotAngle] = useState(0.45);
  const [pitchAngle, setPitchAngle] = useState(0.35);

  const activeChannel = target.spectrum102[sliceIndex] ?? target.spectrum102[51];

  // Continuous 3D isometric cube rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let currentRot = rotAngle;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      if (isRotating) {
        currentRot += 0.008;
      }

      // 3D Isometric projection center
      const centerX = w * 0.5;
      const centerY = h * 0.52;
      const cubeSize = Math.min(w, h) * 0.38;

      const cosR = Math.cos(currentRot);
      const sinR = Math.sin(currentRot);
      const cosP = Math.cos(pitchAngle);
      const sinP = Math.sin(pitchAngle);

      // Project 3D point (x, y, z in [-1, 1]) to 2D screen
      const project = (x: number, y: number, z: number) => {
        // Rotate around Y axis (yaw)
        const x1 = x * cosR - z * sinR;
        const z1 = x * sinR + z * cosR;

        // Rotate around X axis (pitch)
        const y2 = y * cosP - z1 * sinP;
        const z2 = y * sinP + z1 * cosP;

        const scale = 1 / (2.6 + z2 * 0.4);
        return {
          px: centerX + x1 * cubeSize * scale * 2.2,
          py: centerY + y2 * cubeSize * scale * 2.2,
          depth: z2,
        };
      };

      // 1. Draw 3D Bounding Box Wireframe (AllSkyCube RA x Dec x Lambda)
      const corners = [
        [-1, -1, -1],
        [1, -1, -1],
        [1, 1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1],
      ].map(([x, y, z]) => project(x, y, z));

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // Front face
        [4, 5], [5, 6], [6, 7], [7, 4], // Back face
        [0, 4], [1, 5], [2, 6], [3, 7], // Connecting edges
      ];

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (const [i, j] of edges) {
        ctx.beginPath();
        ctx.moveTo(corners[i].px, corners[i].py);
        ctx.lineTo(corners[j].px, corners[j].py);
        ctx.stroke();
      }

      // 2. Draw 102 stacked spectral slices along Z axis (Lambda: 0.75 to 5.00 um)
      const numSampleSlices = 18;
      for (let s = 0; s < numSampleSlices; s += 1) {
        const normZ = -1 + (s / (numSampleSlices - 1)) * 2;
        const isSelectedSlice = Math.abs(s / (numSampleSlices - 1) - sliceIndex / 101) < 0.04;

        const p1 = project(-0.95, -0.95, normZ);
        const p2 = project(0.95, -0.95, normZ);
        const p3 = project(0.95, 0.95, normZ);
        const p4 = project(-0.95, 0.95, normZ);

        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();

        if (isSelectedSlice) {
          ctx.fillStyle = 'rgba(82, 183, 154, 0.28)';
          ctx.fill();
          ctx.strokeStyle = '#52B79A';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.lineWidth = 0.75;
          ctx.stroke();
        }
      }

      // 3. Draw active target voxel intensity centroid inside the cube
      const targetNormZ = -1 + (sliceIndex / 101) * 2;
      const targetCenter = project(0.05, -0.08, targetNormZ);

      // Glowing centroid
      const grad = ctx.createRadialGradient(
        targetCenter.px,
        targetCenter.py,
        1,
        targetCenter.px,
        targetCenter.py,
        16,
      );
      grad.addColorStop(0, 'rgba(82, 183, 154, 0.95)');
      grad.addColorStop(0.4, 'rgba(92, 124, 250, 0.45)');
      grad.addColorStop(1, 'rgba(82, 183, 154, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(targetCenter.px, targetCenter.py, 16, 0, Math.PI * 2);
      ctx.fill();

      // Core point
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(targetCenter.px, targetCenter.py, 3, 0, Math.PI * 2);
      ctx.fill();

      // 4. Axis labels in 3D
      const raAxisEnd = project(1.2, 0, -1);
      const decAxisEnd = project(0, 1.2, -1);
      const lambdaAxisEnd = project(0, 0, 1.25);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#8E94A0';
      ctx.fillText('RA →', raAxisEnd.px, raAxisEnd.py);
      ctx.fillText('Dec ↓', decAxisEnd.px, decAxisEnd.py);
      ctx.fillStyle = '#52B79A';
      ctx.fillText('λ (0.75–5.00μm) →', lambdaAxisEnd.px, lambdaAxisEnd.py);

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeChannel, isRotating, pitchAngle, rotAngle, sliceIndex, target]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-3 p-3 bg-[#131418] rounded-xl border border-white/[0.06] select-none">
      {/* 3D INTERPRETATION (Left Sub-Panel) */}
      <div className="flex-1 flex flex-col bg-[#0F1014] rounded-lg border border-white/[0.05] p-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Box className="w-3.5 h-3.5 text-[#52B79A]" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Interpretación 3D — Cubo Espectral (AllSkyCube)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsRotating((p) => !p)}
              className="p-1 rounded bg-[#202126] hover:bg-[#2A2B33] text-[#C8CDD6] hover:text-white transition-colors"
              title={isRotating ? 'Pausar rotación 3D' : 'Rotar automáticamente'}
            >
              {isRotating ? <Pause className="w-3 h-3 text-[#52B79A]" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setRotAngle(0.45);
                setPitchAngle(0.35);
              }}
              className="p-1 rounded bg-[#202126] hover:bg-[#2A2B33] text-[#8E94A0] hover:text-white transition-colors"
              title="Restablecer ángulo isométrico"
            >
              <Rotate3d className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 3D Interactive Canvas */}
        <div className="flex-1 relative min-h-[160px] w-full">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 border border-white/10 text-[9px] font-mono text-[#8E94A0]">
            Ejes: RA × Dec × λ (102 capas)
          </div>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-[#52B79A]/20 border border-[#52B79A]/40 text-[9px] font-mono text-[#52B79A]">
            λ = {activeChannel.wavelengthUm.toFixed(3)} μm (#{activeChannel.channel})
          </div>
        </div>

        {/* Slice Scrubber */}
        <div className="pt-2 border-t border-white/[0.06] space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#8E94A0]">Capa espectral (0.75 a 5.00 μm):</span>
            <span className="text-white font-semibold">
              Canal #{activeChannel.channel} ({activeChannel.lvfBand}) • {activeChannel.wavelengthUm.toFixed(2)} μm
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={101}
            value={sliceIndex}
            onChange={(e) => {
              const nextIdx = Number(e.target.value);
              setSliceIndex(nextIdx);
              const ch = target.spectrum102[nextIdx];
              if (ch) {
                onSelectWavelength?.(ch.wavelengthUm);
              }
            }}
            className="w-full accent-[#52B79A] h-1.5 bg-[#202126] rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 2D INTERPRETATION (Right Sub-Panel con el texto solicitado) */}
      <div className="flex-1 flex flex-col bg-[#0F1014] rounded-lg border border-white/[0.05] p-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#5C7CFA]" />
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Interpretación 2D — Corte Espectral (RA × Dec)
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#5C7CFA] bg-[#5C7CFA]/15 px-2 py-0.5 rounded border border-[#5C7CFA]/30">
            FITS Plano 2D
          </span>
        </div>

        {/* Frame 2D con el texto explícito requerido */}
        <div className="flex-1 rounded-lg border border-dashed border-white/[0.14] bg-[#0A0B0E] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
          {/* Grilla sutil astronómica en el fondo */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* Retícula de centroide */}
          <div className="w-16 h-16 rounded-full border border-[#52B79A]/30 flex items-center justify-center relative mb-3">
            <div className="w-8 h-8 rounded-full border border-[#52B79A]/50 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#52B79A] shadow-[0_0_8px_#52B79A]" />
            </div>
            <div className="absolute w-full h-[1px] bg-[#52B79A]/30" />
            <div className="absolute h-full w-[1px] bg-[#52B79A]/30" />
          </div>

          {/* Texto explícito solicitado por el usuario */}
          <div className="relative z-10 max-w-sm space-y-1.5">
            <div className="text-xs font-mono font-bold text-white tracking-wide">
              Aquí irá la proyección 2D del cubo espectral SPHEREx
            </div>
            <p className="text-[11px] font-mono text-[#8E94A0] leading-relaxed">
              Corte fotométrico calibrado en el plano RA × Dec correspondiente a la capa espectral activa (λ = {activeChannel.wavelengthUm.toFixed(2)} μm, {activeChannel.lvfBand}).
            </p>
            <div className="pt-2 text-[10px] font-mono text-[#5C7CFA]">
              [ Espacio reservado para integración de recorte FITS 2D ]
            </div>
          </div>

          {/* Metadatos técnicos de pie */}
          <div className="absolute bottom-2 inset-x-3 flex items-center justify-between text-[9px] font-mono text-[#686B75] border-t border-white/[0.04] pt-1">
            <span>Matriz: 1024 × 1024 px</span>
            <span>Escala: 6.2&quot;/pixel (SPHEREx WCS)</span>
            <span>Capa #{activeChannel.channel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
