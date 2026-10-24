import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PhotoImg } from './PhotoImg';
import s from './components.module.css';

export function PhotoGallery({ photoIds, alt }: { photoIds: string[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  if (photoIds.length === 0) return null;
  const index = Math.min(current, photoIds.length - 1);

  return (
    <div className={s.gallery}>
      <button type="button" className={s.galleryMain} onClick={() => setOpen(true)} aria-label="크게 보기">
        <PhotoImg id={photoIds[index]} size="full" alt={alt} />
      </button>
      {photoIds.length > 1 && (
        <div className={s.galleryStrip}>
          {photoIds.map((id, i) => (
            <button
              key={id}
              type="button"
              className={s.galleryThumb}
              aria-current={i === index}
              onClick={() => setCurrent(i)}
              aria-label={`${i + 1}번째 사진`}
            >
              <PhotoImg id={id} />
            </button>
          ))}
        </div>
      )}
      {open && <Lightbox photoIds={photoIds} start={index} onClose={() => setOpen(false)} onChange={setCurrent} />}
    </div>
  );
}

interface LightboxProps {
  photoIds: string[];
  start: number;
  onClose: () => void;
  onChange?: (index: number) => void;
}

export function Lightbox({ photoIds, start, onClose, onChange }: LightboxProps) {
  const [index, setIndex] = useState(start);
  const count = photoIds.length;

  const go = (delta: number) => {
    const next = (index + delta + count) % count;
    setIndex(next);
    onChange?.(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  });

  return (
    <div className={s.lightbox} role="dialog" aria-modal="true" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <PhotoImg id={photoIds[index]} size="full" />
      </div>
      <button type="button" className={`${s.lightboxBtn} ${s.lightboxClose}`} onClick={onClose} aria-label="닫기">
        <X />
      </button>
      {count > 1 && (
        <>
          <button
            type="button"
            className={`${s.lightboxBtn} ${s.lightboxPrev}`}
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="이전 사진"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className={`${s.lightboxBtn} ${s.lightboxNext}`}
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="다음 사진"
          >
            <ChevronRight />
          </button>
          <span className={s.lightboxCount}>
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}
