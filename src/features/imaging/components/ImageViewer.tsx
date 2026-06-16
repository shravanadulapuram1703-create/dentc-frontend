import { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  Tag,
} from 'lucide-react';
import type { GalleryImage } from '../types';
import { fileHref } from '../utils/imageFilters';
import { parseTeeth } from '../utils/toothCodes';

interface ImageViewerProps {
  image: GalleryImage;
  onClose: () => void;
  onAssociate: (image: GalleryImage) => void;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;
const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

/**
 * Full-screen image viewer with zoom / pan / rotate / fit / fullscreen.
 * Transforms are applied imperatively (refs + rAF) so dragging stays smooth
 * without a React render per pointer move. Dependency-free.
 */
export default function ImageViewer({ image, onClose, onAssociate }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const scaleRef = useRef(1);
  const rotateRef = useRef(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; baseX: number; baseY: number }>(
    { active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 },
  );

  const [scaleLabel, setScaleLabel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const apply = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    img.style.transform = `translate(${txRef.current}px, ${tyRef.current}px) scale(${scaleRef.current}) rotate(${rotateRef.current}deg)`;
  }, []);

  const reset = useCallback(() => {
    scaleRef.current = 1;
    rotateRef.current = 0;
    txRef.current = 0;
    tyRef.current = 0;
    setScaleLabel(1);
    apply();
  }, [apply]);

  const zoom = useCallback(
    (factor: number) => {
      scaleRef.current = clamp(scaleRef.current * factor);
      setScaleLabel(scaleRef.current);
      apply();
    },
    [apply],
  );

  const rotate = useCallback(() => {
    rotateRef.current = (rotateRef.current + 90) % 360;
    apply();
  }, [apply]);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  // Reset transform whenever the displayed image changes.
  useEffect(() => {
    reset();
  }, [image.document.id, reset]);

  // Track fullscreen state.
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (!document.fullscreenElement) onClose();
          break;
        case '+':
        case '=':
          zoom(1.2);
          break;
        case '-':
          zoom(1 / 1.2);
          break;
        case 'r':
        case 'R':
          rotate();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case '0':
          reset();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, rotate, toggleFullscreen, reset, onClose]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: txRef.current,
      baseY: tyRef.current,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    txRef.current = drag.baseX + dx;
    tyRef.current = drag.baseY + dy;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        apply();
      });
    }
  };

  const onPointerUp = () => {
    dragRef.current.active = false;
  };

  const teeth = parseTeeth(image.detail?.teeth);
  const href = fileHref(image.document.file_url);

  const toolBtn =
    'p-2 rounded-lg text-white/90 hover:bg-white/15 transition-colors disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 flex flex-col" role="dialog" aria-modal="true">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{image.document.file_name}</div>
          <div className="text-xs text-white/60">
            {image.document.document_type || 'Image'}
            {teeth.length > 0 && ` · teeth ${teeth.map((t) => `#${t}`).join(', ')}`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={toolBtn} onClick={() => zoom(1 / 1.2)} title="Zoom out (-)">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-xs font-semibold text-white/80 w-12 text-center tabular-nums">
            {Math.round(scaleLabel * 100)}%
          </span>
          <button type="button" className={toolBtn} onClick={() => zoom(1.2)} title="Zoom in (+)">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button type="button" className={toolBtn} onClick={rotate} title="Rotate (R)">
            <RotateCw className="w-5 h-5" />
          </button>
          <button type="button" className={toolBtn} onClick={reset} title="Fit / reset (0)">
            <span className="text-xs font-bold px-1">FIT</span>
          </button>
          <button
            type="button"
            className={toolBtn}
            onClick={() => onAssociate(image)}
            title="Associate teeth"
          >
            <Tag className="w-5 h-5" />
          </button>
          <a className={toolBtn} href={href} target="_blank" rel="noreferrer" title="Download">
            <Download className="w-5 h-5" />
          </a>
          <button type="button" className={toolBtn} onClick={toggleFullscreen} title="Fullscreen (F)">
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button type="button" className={toolBtn} onClick={onClose} title="Close (Esc)">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center bg-black cursor-grab active:cursor-grabbing select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          ref={imgRef}
          src={href}
          alt={image.document.file_name}
          draggable={false}
          className="max-w-full max-h-full will-change-transform"
          style={{ transformOrigin: 'center center' }}
        />
      </div>
    </div>
  );
}
