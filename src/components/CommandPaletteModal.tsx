import { useEffect, useRef, useState } from 'react';
import { Search, Telescope, X } from 'lucide-react';
import type { TargetData } from '../types';

interface CommandPaletteModalProps {
  targets: TargetData[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (target: TargetData) => void;
}

export function CommandPaletteModal({
  targets,
  isOpen,
  onClose,
  onSelectTarget,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = targets.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.designation.toLowerCase().includes(query.toLowerCase()) ||
      t.classification.toLowerCase().includes(query.toLowerCase()) ||
      t.raFormatted.includes(query) ||
      t.decFormatted.includes(query),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0D111A] border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#121724]">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar blanco astronómico o coordenadas..."
            className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none font-mono"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-white/5 p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-neutral-500">
              No se encontraron blancos para &quot;{query}&quot;
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelectTarget(t);
                  onClose();
                }}
                className="w-full text-left p-3 rounded-xl hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                    <Telescope className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">
                      {t.designation} • {t.classification}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-[10px] text-neutral-400">
                  <div>{t.raFormatted}</div>
                  <div>{t.decFormatted}</div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 bg-[#090C14] border-t border-white/10 text-[10px] font-mono text-neutral-500 flex items-center justify-between">
          <span>SPHEREx J2000 Catalog</span>
          <span>[Esc] Cerrar • [Enter] Seleccionar</span>
        </div>
      </div>
    </div>
  );
}
