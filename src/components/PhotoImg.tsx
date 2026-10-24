import { useEffect, useState } from 'react';
import { usePhoto } from '../data/hooks';

function useObjectUrl(blob: Blob | undefined) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}

interface BlobImgProps {
  blob: Blob | undefined;
  alt?: string;
  className?: string;
}

export function BlobImg({ blob, alt = '', className }: BlobImgProps) {
  const url = useObjectUrl(blob);
  if (!url) return <div className={`photo-skeleton ${className ?? ''}`} />;
  return <img src={url} alt={alt} className={className} decoding="async" draggable={false} />;
}

interface PhotoImgProps {
  id: string;
  /** thumb: 목록용 작은 사진, full: 크게 보기 */
  size?: 'thumb' | 'full';
  alt?: string;
  className?: string;
}

/** 저장된 사진을 id로 불러와 보여준다. */
export function PhotoImg({ id, size = 'thumb', alt, className }: PhotoImgProps) {
  const photo = usePhoto(id);
  return <BlobImg blob={size === 'thumb' ? photo?.thumb : photo?.blob} alt={alt} className={className} />;
}
