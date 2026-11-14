import { type ReactNode, useEffect, useRef, useState } from 'react';
import { GripHorizontal } from 'lucide-react';

interface DraggableHUDPanelProps {
  id: string;
  defaultPosition: { x: number; y: number };
  children: ReactNode;
  className?: string;
  headerTitle?: string;
}

export function DraggableHUDPanel({
  defaultPosition,
  children,
  className = '',
  headerTitle,
}: DraggableHUDPanelProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  useEffect(() => {
    setPosition(defaultPosition);
  }, [defaultPosition.x, defaultPosition.y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking the drag handle or header, not inside interactive buttons/inputs
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, canvas, a')) {
      return;
    }
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 120, dragRef.current.initX + dx));
      const newY = Math.max(50, Math.min(window.innerHeight - 80, dragRef.current.initY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        position: 'fixed',
        top: 0,
        left: 0,
      }}
      className={`z-30 select-none transition-shadow ${
        isDragging ? 'cursor-grabbing shadow-2xl opacity-95' : ''
      } ${className}`}
    >
      <div onMouseDown={handleMouseDown} className="cursor-grab active:cursor-grabbing">
        {headerTitle && (
          <div className="flex items-center justify-between px-2 pt-0.5 pb-1 text-[9px] font-mono text-zinc-400/80 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <GripHorizontal className="w-3 h-3 text-zinc-500" />
              {headerTitle}
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
