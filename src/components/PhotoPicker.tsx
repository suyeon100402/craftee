import { useRef, useState } from 'react';
import { Camera, Star, X } from 'lucide-react';
import type { Photo } from '../data/types';
import type { PhotoChanges } from '../data/repo';
import { processImage } from '../lib/image';
import { BlobImg, PhotoImg } from './PhotoImg';
import { useConfirm } from './ConfirmDialog';
import s from './components.module.css';

/** 편집 중인 사진 하나. photo가 있으면 아직 저장하지 않은 새 사진이다. */
export interface DraftPhoto {
  id: string;
  photo?: Photo;
}

/**
 * 편집 화면에서 사진 목록을 다룬다. 저장 버튼을 누르기 전까지는 DB에 쓰지 않고,
 * 저장할 때 changes()로 새로 추가한 사진과 지운 사진을 한꺼번에 넘긴다.
 */
export function usePhotoDraft(initialIds: string[]) {
  const [items, setItems] = useState<DraftPhoto[]>(() => initialIds.map((id) => ({ id })));
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  async function addFiles(files: FileList | File[]) {
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const photo = await processImage(file);
        setItems((prev) => [...prev, { id: photo.id, photo }]);
      }
    } catch (e) {
      void confirm({
        title: '사진을 불러오지 못했어요',
        message: e instanceof Error ? e.message : undefined,
        alertOnly: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return {
    items,
    busy,
    addFiles,
    remove: (id: string) => setItems((prev) => prev.filter((i) => i.id !== id)),
    makeCover: (id: string) =>
      setItems((prev) => [...prev.filter((i) => i.id === id), ...prev.filter((i) => i.id !== id)]),
    ids: () => items.map((i) => i.id),
    changes: (): PhotoChanges => ({
      added: items.flatMap((i) => (i.photo ? [i.photo] : [])),
      removedIds: initialIds.filter((id) => !items.some((i) => i.id === id)),
    }),
  };
}

type Draft = ReturnType<typeof usePhotoDraft>;

export function PhotoPicker({ draft, addLabel = '사진 추가' }: { draft: Draft; addLabel?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={s.picker}>
      {draft.items.map((item, index) => (
        <div key={item.id} className={s.pickerItem}>
          {item.photo ? <BlobImg blob={item.photo.thumb} /> : <PhotoImg id={item.id} />}
          <button type="button" className={s.pickerRemove} onClick={() => draft.remove(item.id)} aria-label="사진 빼기">
            <X size={16} />
          </button>
          {index === 0 ? (
            <span className={s.coverLabel}>대표</span>
          ) : (
            <button
              type="button"
              className={s.pickerCover}
              onClick={() => draft.makeCover(item.id)}
              aria-label="대표 사진으로"
              title="대표 사진으로"
            >
              <Star size={15} />
            </button>
          )}
        </div>
      ))}
      <button type="button" className={s.pickerAdd} onClick={() => inputRef.current?.click()} disabled={draft.busy}>
        <Camera size={24} />
        {draft.busy ? '줄이는 중…' : addLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) void draft.addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
