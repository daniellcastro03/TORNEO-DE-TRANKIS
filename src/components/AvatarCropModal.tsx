import { useRef, useState, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, Move } from 'lucide-react';

interface AvatarCropModalProps {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onClose: () => void;
}

const PREVIEW = 260;
const OUTPUT = 400;

export default function AvatarCropModal({ imageSrc, onCrop, onClose }: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [imgReady, setImgReady] = useState(false);

  // Load image and set initial scale to fill circle
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const initScale = Math.max(PREVIEW / img.width, PREVIEW / img.height);
      setScale(initScale);
      setOffset({ x: 0, y: 0 });
      setImgReady(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw preview whenever state changes
  useEffect(() => {
    if (!imgReady) return;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, PREVIEW, PREVIEW);

    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const x = (PREVIEW - drawW) / 2 + offset.x;
    const y = (PREVIEW - drawH) / 2 + offset.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    // Draw circle border
    ctx.beginPath();
    ctx.arc(PREVIEW / 2, PREVIEW / 2, PREVIEW / 2 - 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'var(--color-neon, #39FF14)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [scale, offset, imgReady]);

  // Mouse/Touch handlers
  const startDrag = useCallback((clientX: number, clientY: number) => {
    setDragging(true);
    setLastPos({ x: clientX, y: clientY });
  }, []);

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragging) return;
    const dx = clientX - lastPos.x;
    const dy = clientY - lastPos.y;
    setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPos({ x: clientX, y: clientY });
  }, [dragging, lastPos]);

  const stopDrag = useCallback(() => setDragging(false), []);

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = OUTPUT;
    offscreen.height = OUTPUT;
    const ctx = offscreen.getContext('2d')!;

    const ratio = OUTPUT / PREVIEW;
    const drawW = img.width * scale * ratio;
    const drawH = img.height * scale * ratio;
    const x = (OUTPUT - drawW) / 2 + offset.x * ratio;
    const y = (OUTPUT - drawH) / 2 + offset.y * ratio;

    ctx.beginPath();
    ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, drawW, drawH);

    offscreen.toBlob(blob => { if (blob) onCrop(blob); }, 'image/jpeg', 0.92);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✂️ Ajustar foto de perfil</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Move size={13} /> Arrastra para encuadrar · Desliza para zoom
          </p>

          {!imgReady ? (
            <div style={{ width: PREVIEW, height: PREVIEW, borderRadius: '50%', background: 'var(--color-bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={PREVIEW}
              height={PREVIEW}
              style={{
                borderRadius: '50%',
                cursor: dragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
                maxWidth: '100%',
              }}
              onMouseDown={e => startDrag(e.clientX, e.clientY)}
              onMouseMove={e => moveDrag(e.clientX, e.clientY)}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onTouchStart={e => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={e => { e.preventDefault(); moveDrag(e.touches[0].clientX, e.touches[0].clientY); }}
              onTouchEnd={stopDrag}
            />
          )}

          {/* Zoom slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
            <ZoomOut size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <input
              type="range"
              min={0.3}
              max={5}
              step={0.01}
              value={scale}
              onChange={e => setScale(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <ZoomIn size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!imgReady}>
            <Check size={16} /> Guardar foto
          </button>
        </div>
      </div>
    </div>
  );
}
