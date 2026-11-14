import { useEffect, useMemo, useRef, useState } from 'react';
import type { TargetCatalogEntry } from '../types/spherex';
import { parseRaDecInput } from '../utils/urlState';

interface CommandSearchModalProps {
  targets: TargetCatalogEntry[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTarget: (target: TargetCatalogEntry) => void;
  onJumpCoordinates: (ra: number, dec: number) => void;
  onExecuteAction: (action: 'blink' | 'diff' | 'sum' | 'split' | 'motion' | 'selection') => void;
}

interface CommandItem {
  id: string;
  label: string;
  detail?: string;
  run: () => void;
}

export function CommandSearchModal({
  targets,
  isOpen,
  onClose,
  onSelectTarget,
  onJumpCoordinates,
  onExecuteAction,
}: CommandSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (isOpen) {
          e.preventDefault();
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 15);
    }
  }, [isOpen]);

  const parsedCoords = useMemo(() => parseRaDecInput(query), [query]);

  const items = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [];
    const q = query.trim().toLowerCase();

    if (parsedCoords) {
      list.push({
        id: 'jump-coords',
        label: `> Centrar Telescopio: RA ${parsedCoords.ra.toFixed(4)}°, Dec ${parsedCoords.dec.toFixed(4)}°`,
        detail: 'Salto directo',
        run: () => {
          onJumpCoordinates(parsedCoords.ra, parsedCoords.dec);
          onClose();
        },
      });
    }

    const baseCommands: CommandItem[] = [
      {
        id: 'go-barnard',
        label: "> Go to: Barnard's Star",
        detail: 'Enana roja (μ = 10.36"/año)',
        run: () => {
          const t = targets.find((x) => x.id === 'barnards-star') ?? targets[0];
          onSelectTarget(t);
          onClose();
        },
      },
      {
        id: 'act-blink',
        label: '> Activate Blink Mode',
        detail: 'Alternar épocas con Espacio',
        run: () => {
          onExecuteAction('blink');
          onClose();
        },
      },
      {
        id: 'analyze-wise',
        label: '> Analyze Spectrum: WISE 0855',
        detail: 'Enana marrón fría (H₂O + CH₄)',
        run: () => {
          const t = targets.find((x) => x.id === 'wise-0855') ?? targets[0];
          onSelectTarget(t);
          onClose();
        },
      },
      {
        id: 'act-diff',
        label: '> Difference Mode (Resta T₂ − T₁)',
        detail: 'Filtro de sustracción temporal para dipolos',
        run: () => {
          onExecuteAction('diff');
          onClose();
        },
      },
      {
        id: 'act-sum',
        label: '> Co-Added Sum Mode (Suma T₁ + T₂)',
        detail: 'Suma temporal para mejorar relación señal-ruido (SNR)',
        run: () => {
          onExecuteAction('sum');
          onClose();
        },
      },
      {
        id: 'act-split',
        label: '> Open 6 LVF Detectors & Multi-Epoch Split',
        detail: 'Suma por separado de los 6 conjuntos de detectores',
        run: () => {
          onExecuteAction('split');
          onClose();
        },
      },
      {
        id: 'act-motion',
        label: '> Open Motion Deck',
        detail: 'Filtros cinemáticos',
        run: () => {
          onExecuteAction('motion');
          onClose();
        },
      },
      {
        id: 'act-selection',
        label: '> Open Selection Tool',
        detail: 'Recuadro 0.2° × 0.2°',
        run: () => {
          onExecuteAction('selection');
          onClose();
        },
      },
    ];

    if (!q) {
      list.push(...baseCommands);
      targets
        .filter((t) => t.id !== 'barnards-star' && t.id !== 'wise-0855')
        .forEach((t) => {
          list.push({
            id: `target-${t.id}`,
            label: `> Go to: ${t.name}`,
            detail: `RA ${t.raDeg.toFixed(2)}°`,
            run: () => {
              onSelectTarget(t);
              onClose();
            },
          });
        });
    } else {
      targets
        .filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.designation.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q),
        )
        .forEach((t) => {
          list.push({
            id: `target-${t.id}`,
            label: `> Go to: ${t.name}`,
            detail: t.designation,
            run: () => {
              onSelectTarget(t);
              onClose();
            },
          });
        });

      baseCommands
        .filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            (c.detail && c.detail.toLowerCase().includes(q)),
        )
        .forEach((c) => {
          if (!list.some((existing) => existing.id === c.id)) {
            list.push(c);
          }
        });
    }

    return list;
  }, [onClose, onExecuteAction, onJumpCoordinates, onSelectTarget, parsedCoords, query, targets]);

  useEffect(() => {
    setActiveIdx(0);
  }, [items.length, query]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((p) => (items.length > 0 ? (p + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((p) => (items.length > 0 ? (p - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter' && items[activeIdx]) {
      e.preventDefault();
      items[activeIdx].run();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/25 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Sleek, seamless, translucent card matching reference image 4 top-left without box-ception or green accents */}
      <div
        className="w-full max-w-[460px] hud-card rounded-xl p-3 shadow-2xl animate-panel-enter space-y-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-white/[0.08]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="[Cmd+k] Search Telemetry..."
            className="w-full bg-transparent text-xs font-mono text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-slate-400">
            Esc
          </kbd>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-0.5 pt-1">
          {items.map((item, idx) => {
            const active = idx === activeIdx;
            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={item.run}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-3 text-xs font-mono transition-colors ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <span className="truncate">{item.label}</span>
                {item.detail && (
                  <span className="text-[10px] text-slate-400 shrink-0 font-sans">
                    {item.detail}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
