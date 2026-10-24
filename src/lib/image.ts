import type { Photo } from '../data/types';
import { newId } from './id';

const FULL_MAX_SIDE = 1600;
const THUMB_MAX_SIDE = 480;

type Drawable = ImageBitmap | HTMLImageElement;

async function load(file: Blob): Promise<Drawable> {
  try {
    // 사진의 회전 정보(EXIF)를 반영해서 연다.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function sizeOf(src: Drawable) {
  return src instanceof HTMLImageElement
    ? { width: src.naturalWidth, height: src.naturalHeight }
    : { width: src.width, height: src.height };
}

function resize(src: Drawable, maxSide: number, quality: number) {
  const { width, height } = sizeOf(src);
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, w, h);
  return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) => {
    // 아이폰 Safari는 WebP로 저장을 못 해서 JPEG를 쓴다.
    canvas.toBlob(
      (blob) => (blob ? resolve({ blob, width: w, height: h }) : reject(new Error('사진을 변환하지 못했어요.'))),
      'image/jpeg',
      quality,
    );
  });
}

/** 고른 사진 파일을 저장용 크기와 썸네일로 줄인다. */
export async function processImage(file: Blob): Promise<Photo> {
  const src = await load(file);
  try {
    const full = await resize(src, FULL_MAX_SIDE, 0.85);
    const thumb = await resize(src, THUMB_MAX_SIDE, 0.8);
    return {
      id: newId(),
      blob: full.blob,
      thumb: thumb.blob,
      width: full.width,
      height: full.height,
      createdAt: Date.now(),
    };
  } finally {
    if ('close' in src) src.close();
  }
}
