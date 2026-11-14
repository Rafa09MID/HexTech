import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { TargetData } from '../types';

interface SplitViewProps {
  target: TargetData;
  isDiffMode: boolean;
  blinkFrame: 1 | 2;
  onToggleFullScreenCanvas: () => void;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

function rotateX(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

function rotateY(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
}

function rotateZ(p: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.y * sin + p.y * cos, z: p.z };
}

export function SplitView({
  target,
  isDiffMode,
  blinkFrame,
  onToggleFullScreenCanvas,
}: SplitViewProps) {
  const [zoom, setZoom] = useState(1.0);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ rotX: 0.38, rotY: -0.42 });
  const isDragging3DRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // 1. Render Left Canvas: Real Infrared Astronomical Observation
  useEffect(() => {
    const canvas = leftCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.02;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Draw random but deterministic field stars
      for (let i = 0; i < 90; i += 1) {
        const sx = ((Math.sin(i * 19.34 + target.raDeg) * 43758.5453) % 1) * w;
        const sy = ((Math.sin(i * 73.12 + target.decDeg) * 24634.6345) % 1) * h;
        const r = (i % 5 === 0) ? 1.4 : 0.8;
        const alpha = 0.25 + (Math.sin(i + t * 0.5) * 0.1 + 0.15);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const effectiveZoom = zoom;
      const baseRadius = Math.min(w, h) * 0.25 * effectiveZoom;

      // Blink position shift
      const blinkShiftY = blinkFrame === 2 && !isDiffMode ? -14 * effectiveZoom : 0;

      // In difference mode (T2 - T1), render the negative & positive dipole lobes
      if (isDiffMode) {
        // Red -T1 lobe
        const redGrad = ctx.createRadialGradient(cx, cy + 14 * effectiveZoom, 0, cx, cy + 14 * effectiveZoom, baseRadius * 0.9);
        redGrad.addColorStop(0, 'rgba(239, 68, 68, 0.85)');
        redGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.2)');
        redGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = redGrad;
        ctx.beginPath();
        ctx.arc(cx, cy + 14 * effectiveZoom, baseRadius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Cyan +T2 lobe
        const cyanGrad = ctx.createRadialGradient(cx, cy - 14 * effectiveZoom, 0, cx, cy - 14 * effectiveZoom, baseRadius * 0.9);
        cyanGrad.addColorStop(0, 'rgba(34, 211, 238, 0.95)');
        cyanGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.3)');
        cyanGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cyanGrad;
        ctx.beginPath();
        ctx.arc(cx, cy - 14 * effectiveZoom, baseRadius * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#67E8F9';
        ctx.fillText('+T2 DIPOLE', cx + 22, cy - 18 * effectiveZoom);
        ctx.fillStyle = '#FCA5A5';
        ctx.fillText('-T1 DIPOLE', cx + 22, cy + 20 * effectiveZoom);
      } else {
        // Outer diffuse halo
        const haloGrad = ctx.createRadialGradient(cx, cy + blinkShiftY, 0, cx, cy + blinkShiftY, baseRadius * 1.5);
        haloGrad.addColorStop(0, target.colorScheme.halo);
        haloGrad.addColorStop(0.4, 'rgba(255, 180, 100, 0.18)');
        haloGrad.addColorStop(0.8, 'rgba(255, 140, 60, 0.04)');
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(cx, cy + blinkShiftY, baseRadius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Core bright glow
        const coreGrad = ctx.createRadialGradient(cx, cy + blinkShiftY, 0, cx, cy + blinkShiftY, baseRadius * 0.28);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.45, target.colorScheme.core);
        coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy + blinkShiftY, baseRadius * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Astrometric Track / Proper Motion Trail (as seen in Image 1)
        if (target.wireframe.showJet) {
          const trailLength = baseRadius * 1.25;
          ctx.strokeStyle = 'rgba(180, 225, 255, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx, cy + blinkShiftY);
          ctx.lineTo(cx, cy + blinkShiftY + trailLength);
          ctx.stroke();

          // Semestral epoch knots
          for (const frac of [0.35, 0.65, 0.95]) {
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx, cy + blinkShiftY + trailLength * frac, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [blinkFrame, isDiffMode, target, zoom]);

  // 2. Render Right Canvas: 3D Wireframe Ellipsoid & Kinematics Model
  useEffect(() => {
    const canvas = rightCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

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
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const baseRadius = Math.min(w, h) * 0.36 * zoom;

      // Central core glow shining through the wireframe
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseRadius * 0.45);
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      glowGrad.addColorStop(0.25, target.colorScheme.halo);
      glowGrad.addColorStop(0.7, 'rgba(255, 200, 140, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Kinematic vector arrow inside the 3D ellipsoid
      if (target.wireframe.showJet) {
        const vLen = baseRadius * 0.4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + vLen);
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy + vLen, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Mathematical 3D Ellipsoid Wireframe
      const [ax, ay, az] = target.wireframe.axesRatio;
      const fovDist = 800;

      const project = (p: Point3D): { px: number; py: number; depth: number } => {
        let rot = rotateZ(p, target.wireframe.rotationAngle);
        rot = rotateX(rot, rotation.rotX);
        rot = rotateY(rot, rotation.rotY);
        const zF = fovDist / (fovDist + rot.z);
        return { px: cx + rot.x * zF, py: cy + rot.y * zF, depth: rot.z };
      };

      // Latitude Parallels
      const numLats = 14;
      for (let i = 1; i < numLats; i += 1) {
        const phi = (Math.PI * i) / numLats - Math.PI / 2;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);
        ctx.beginPath();
        let first = true;
        let avgZ = 0;
        const steps = 48;

        for (let j = 0; j <= steps; j += 1) {
          const theta = (2 * Math.PI * j) / steps;
          const pt: Point3D = {
            x: baseRadius * ax * cosPhi * Math.cos(theta),
            y: baseRadius * ay * sinPhi,
            z: baseRadius * az * cosPhi * Math.sin(theta),
          };
          const proj = project(pt);
          avgZ += proj.depth;
          if (first) {
            ctx.moveTo(proj.px, proj.py);
            first = false;
          } else {
            ctx.lineTo(proj.px, proj.py);
          }
        }

        const isBack = avgZ / steps > 0;
        ctx.strokeStyle = isBack ? 'rgba(255, 255, 255, 0.16)' : target.colorScheme.wireframe;
        ctx.lineWidth = isBack ? 0.7 : 1.1;
        ctx.stroke();
      }

      // Longitude Meridians
      const numLons = 18;
      for (let j = 0; j < numLons; j += 1) {
        const theta = (Math.PI * j) / numLons;
        ctx.beginPath();
        let first = true;
        let avgZ = 0;
        const steps = 48;

        for (let i = 0; i <= steps; i += 1) {
          const phi = (2 * Math.PI * i) / steps;
          const pt: Point3D = {
            x: baseRadius * ax * Math.cos(phi) * Math.cos(theta),
            y: baseRadius * ay * Math.sin(phi),
            z: baseRadius * az * Math.cos(phi) * Math.sin(theta),
          };
          const proj = project(pt);
          avgZ += proj.depth;
          if (first) {
            ctx.moveTo(proj.px, proj.py);
            first = false;
          } else {
            ctx.lineTo(proj.px, proj.py);
          }
        }

        const isBack = avgZ / steps > 0;
        ctx.strokeStyle = isBack ? 'rgba(255, 255, 255, 0.16)' : target.colorScheme.wireframe;
        ctx.lineWidth = isBack ? 0.7 : 1.1;
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [rotation, target, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging3DRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging3DRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    setRotation((prev) => ({
      rotX: prev.rotX + dy * 0.006,
      rotY: prev.rotY + dx * 0.006,
    }));
  };

  const handleMouseUp = () => {
    isDragging3DRef.current = false;
  };

  return (
    <div className="relative flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden bg-black select-none">
      {/* LEFT HALF: Infrared Survey Photo (Image 1) */}
      <div className="relative flex-1 h-full border-b md:border-b-0 md:border-r border-white/[0.1] overflow-hidden">
        <canvas ref={leftCanvasRef} className="w-full h-full block" />

        {/* Top-left Full Screen / Expand icon matching Image 1 */}
        <div className="absolute top-4 left-4 z-20">
          <button
            type="button"
            onClick={onToggleFullScreenCanvas}
            title="Abrir mapa celestial completo"
            className="p-2 rounded-lg bg-[#121622]/70 hover:bg-[#1C2234] border border-white/10 hover:border-cyan-400/50 text-neutral-300 hover:text-white backdrop-blur-md transition-all shadow-md"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom-left zoom controls (+ / - stacked) matching Image 1 */}
        <div className="absolute bottom-6 left-6 z-20 flex flex-col bg-[#121622]/80 border border-white/15 rounded-lg backdrop-blur-md overflow-hidden shadow-lg">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
            aria-label="Acercar zoom"
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/10"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, z / 1.2))}
            aria-label="Alejar zoom"
            className="p-2 text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom label matching Image 1 */}
        <div className="absolute bottom-6 left-20 z-20 pointer-events-none">
          <p className="text-xs font-medium tracking-wide text-neutral-200 drop-shadow">
            {target.surveyTitle}
          </p>
        </div>
      </div>

      {/* RIGHT HALF: 3D Astrometric & Kinematics Model (Image 1) */}
      <div
        className="relative flex-1 h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={rightCanvasRef} className="w-full h-full block" />

        {/* Top-right subtle hint */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 bg-black/60 px-2 py-1 rounded border border-white/5 backdrop-blur-sm">
            Interactive 3D Mesh
          </span>
        </div>

        {/* Bottom label matching Image 1 */}
        <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
          <p className="text-xs font-medium tracking-wide text-neutral-200 drop-shadow">
            {target.modelTitle}
          </p>
        </div>
      </div>
    </div>
  );
}
