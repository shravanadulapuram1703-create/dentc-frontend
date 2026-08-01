import { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type { DicomImage, DicomInstanceOut } from '../types';
import { getDicomInstance } from '@/api/generated/endpoints/imaging/imaging';
import {
  resolveAssetUrl,
  modalityLabel,
  formatStudyDate,
  studyTitle,
} from '../utils/dicomAssets';

interface DicomViewerProps {
  images: DicomImage[];
  /** SOP UID of the image currently shown. */
  currentUid: string;
  onSelect: (image: DicomImage) => void;
  onClose: () => void;
  /** Re-fetch the whole tree (used to recover fresh asset tokens on a 401). */
  onRefreshTree: () => void;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;
const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

/**
 * Full-screen DICOM viewer: shows the full-resolution web JPEG (`web_url`), with
 * zoom / pan / rotate / fit / fullscreen, prev/next across the current image set,
 * a metadata panel, and a "Download DICOM" (`original_url`) action.
 *
 * Handles the two derivative edge cases from the contract (§4):
 *  - `pending` (no `web_url` yet): shows the thumbnail scaled up + a "preparing"
 *    banner and re-polls `GET /dicom-instances/{sop}` until the web JPEG appears.
 *  - `failed` / load error: placeholder + "Download DICOM" fallback; a manual
 *    "Refresh" re-fetches the tree in case the 24h asset token merely expired.
 */
export default function DicomViewer({
  images,
  currentUid,
  onSelect,
  onClose,
  onRefreshTree,
}: DicomViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const scaleRef = useRef(1);
  const rotateRef = useRef(0);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const [scaleLabel, setScaleLabel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const index = images.findIndex((i) => i.instance.sop_instance_uid === currentUid);
  // The parent (DicomStudySection) only mounts the viewer when `images.length > 0`,
  // so the `images[0]` fallback is always defined (noUncheckedIndexedAccess widens
  // the index access to `| undefined`).
  const current = (index >= 0 ? images[index] : images[0])!;

  // The instance we actually render — starts as the one from the tree, but is
  // replaced by re-poll results while a web derivative is still generating.
  const [liveInstance, setLiveInstance] = useState<DicomInstanceOut>(current.instance);
  useEffect(() => {
    setLiveInstance(current.instance);
    setImgError(false);
  }, [current.instance]);

  const assets = liveInstance.assets;
  const webUrl = resolveAssetUrl(assets.web_url);
  const thumbUrl = resolveAssetUrl(assets.thumbnail_url);
  const originalUrl = resolveAssetUrl(assets.original_url);
  const displayUrl = webUrl ?? thumbUrl;
  const isPending = assets.status === 'pending' || (!webUrl && assets.status !== 'failed');

  // Re-poll for the on-demand web JPEG while pending.
  useEffect(() => {
    if (webUrl || assets.status === 'failed') return;
    let cancelled = false;
    let polls = 0;
    const id = window.setInterval(() => {
      polls += 1;
      if (polls > MAX_POLLS) {
        window.clearInterval(id);
        return;
      }
      getDicomInstance(liveInstance.sop_instance_uid)
        .then((fresh) => {
          if (cancelled) return;
          setLiveInstance(fresh);
          if (fresh.assets.web_url || fresh.assets.status === 'failed') {
            window.clearInterval(id);
          }
        })
        .catch(() => {
          /* transient — keep polling until the cap */
        });
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [webUrl, assets.status, liveInstance.sop_instance_uid]);

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

  const goTo = useCallback(
    (delta: number) => {
      if (index < 0) return;
      const next = images[index + delta];
      if (next) onSelect(next);
    },
    [images, index, onSelect],
  );

  // Reset transform when the displayed image changes.
  useEffect(() => {
    reset();
  }, [currentUid, reset]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

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
        case 'ArrowLeft':
          goTo(-1);
          break;
        case 'ArrowRight':
          goTo(1);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom, rotate, toggleFullscreen, reset, onClose, goTo]);

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
    txRef.current = drag.baseX + (e.clientX - drag.startX);
    tyRef.current = drag.baseY + (e.clientY - drag.startY);
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

  const { study, series } = current;
  const teeth = liveInstance.tooth_numbers ?? [];
  const canvasBroken = imgError || !displayUrl;

  const toolBtn =
    'p-2 rounded-lg text-white/90 hover:bg-white/15 transition-colors disabled:opacity-30';

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col" role="dialog" aria-modal="true">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {studyTitle(study)} · #{liveInstance.instance_number ?? liveInstance.id}
          </div>
          <div className="text-xs text-white/60 truncate">
            {formatStudyDate(study.study_date)} · {modalityLabel(liveInstance.modality)}
            {series.description ? ` · ${series.description}` : ''}
            {teeth.length > 0 && ` · teeth ${teeth.map((t) => `#${t}`).join(', ')}`}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
          {originalUrl && (
            <a
              className={toolBtn}
              href={originalUrl}
              download
              title="Download original DICOM (.dcm)"
            >
              <Download className="w-5 h-5" />
            </a>
          )}
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
        className="relative flex-1 overflow-hidden flex items-center justify-center bg-black cursor-grab active:cursor-grabbing select-none"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {canvasBroken ? (
          <div className="text-center text-white/70 px-6">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-white/40" />
            <p className="text-sm font-semibold">
              {assets.status === 'failed' ? 'Preview unavailable' : 'Could not load this image'}
            </p>
            <p className="text-xs text-white/50 mt-1 max-w-sm mx-auto">
              The image token may have expired. Refresh to fetch a new one, or download the original
              DICOM file.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setImgError(false);
                  onRefreshTree();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-sm font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              {originalUrl && (
                <a
                  href={originalUrl}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 text-sm font-semibold"
                >
                  <Download className="w-4 h-4" />
                  Download DICOM
                </a>
              )}
            </div>
          </div>
        ) : (
          <img
            ref={imgRef}
            src={displayUrl}
            alt={`DICOM instance ${liveInstance.instance_number ?? liveInstance.id}`}
            draggable={false}
            className="max-w-full max-h-full will-change-transform"
            style={{ transformOrigin: 'center center' }}
            onError={() => setImgError(true)}
          />
        )}

        {/* Pending banner (thumbnail is shown scaled while the web JPEG generates). */}
        {!canvasBroken && isPending && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Preparing full-resolution image…
          </div>
        )}

        {/* Prev / next */}
        {index > 0 && (
          <button
            type="button"
            onClick={() => goTo(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
            title="Previous (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {index >= 0 && index < images.length - 1 && (
          <button
            type="button"
            onClick={() => goTo(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white"
            title="Next (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Position indicator */}
        {index >= 0 && images.length > 1 && (
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/60 text-white/80 text-xs font-semibold tabular-nums">
            {index + 1} / {images.length}
          </span>
        )}
      </div>
    </div>
  );
}
