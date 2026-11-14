import { useCallback, useEffect, useState } from 'react';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { Header } from './components/Header';
import { SkyCanvasView } from './components/SkyCanvasView';
import { SplitView } from './components/SplitView';
import { TelemetryDrawer } from './components/TelemetryDrawer';
import { TimelineBar } from './components/TimelineBar';
import { TARGETS_DATA } from './data/spherexData';
import type { CanvasMode, TargetData } from './types';

export function App() {
  const [selectedTarget, setSelectedTarget] = useState<TargetData>(TARGETS_DATA[0]);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('split');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  // Timeline & Blink state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBlinkActive, setIsBlinkActive] = useState(false);
  const [isDiffMode, setIsDiffMode] = useState(false);
  const [timelineValue, setTimelineValue] = useState(50);
  const [blinkFrame, setBlinkFrame] = useState<1 | 2>(1);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Blink animation loop when Blink is active
  useEffect(() => {
    if (!isBlinkActive) return;
    const interval = window.setInterval(() => {
      setBlinkFrame((prev) => (prev === 1 ? 2 : 1));
    }, 450);
    return () => window.clearInterval(interval);
  }, [isBlinkActive]);

  // Timelapse playback loop when Playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setTimelineValue((prev) => {
        const next = prev + 5;
        return next > 100 ? 0 : next;
      });
      setBlinkFrame((prev) => (prev === 1 ? 2 : 1));
    }, 400);
    return () => window.clearInterval(interval);
  }, [isPlaying]);

  // Global keyboard shortcuts (Spacebar for Blink, Cmd+K for Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement | null;
        if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setBlinkFrame((prev) => (prev === 1 ? 2 : 1));
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleCanvasMode = useCallback(() => {
    setCanvasMode((prev) => (prev === 'split' ? 'sky' : 'split'));
  }, []);

  const handleRewind = useCallback(() => {
    setTimelineValue(0);
    setBlinkFrame(1);
  }, []);

  const handleFastForward = useCallback(() => {
    setTimelineValue(100);
    setBlinkFrame(2);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden flex flex-col font-sans select-none antialiased">
      {/* 1. Top Navigation Bar matching reference */}
      <Header
        targets={TARGETS_DATA}
        selectedTarget={selectedTarget}
        canvasMode={canvasMode}
        onSelectTarget={(t) => {
          setSelectedTarget(t);
        }}
        onToggleCanvasMode={handleToggleCanvasMode}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* 2. Main Middle Area: Canvas + Telemetry Drawer */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* Sky View Area (Split View vs Full Sky Canvas View) */}
        <div className="relative flex-1 h-full min-w-0 overflow-hidden flex">
          {canvasMode === 'split' ? (
            <SplitView
              target={selectedTarget}
              isDiffMode={isDiffMode}
              blinkFrame={blinkFrame}
              onToggleFullScreenCanvas={handleToggleCanvasMode}
            />
          ) : (
            <SkyCanvasView
              target={selectedTarget}
              onToggleSplitMode={handleToggleCanvasMode}
            />
          )}
        </div>

        {/* Telemetry Drawer on Right Side */}
        <TelemetryDrawer
          target={selectedTarget}
          isOpen={isDrawerOpen}
          onToggleOpen={() => setIsDrawerOpen((prev) => !prev)}
        />
      </div>

      {/* 3. Bottom Bar: Telemetry Timeline matching reference */}
      <TimelineBar
        isPlaying={isPlaying}
        isBlinkActive={isBlinkActive}
        isDiffMode={isDiffMode}
        timelineValue={timelineValue}
        onTogglePlay={() => setIsPlaying((prev) => !prev)}
        onRewind={handleRewind}
        onFastForward={handleFastForward}
        onToggleBlink={() => setIsBlinkActive((prev) => !prev)}
        onToggleDiffMode={() => setIsDiffMode((prev) => !prev)}
        onTimelineChange={setTimelineValue}
      />

      {/* 4. Command Palette Modal (Cmd+K) */}
      <CommandPaletteModal
        targets={TARGETS_DATA}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTarget={(t) => setSelectedTarget(t)}
      />
    </div>
  );
}

export default App;
