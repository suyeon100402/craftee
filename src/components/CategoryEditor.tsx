import { useState } from 'react';
import type { Category, CategoryColor } from '../data/types';
import { CATEGORY_COLORS, EMOJI_SUGGESTIONS, FALLBACK_CATEGORY_ID } from '../data/meta';
import { newBase } from '../data/repo';
import { CATEGORY_REPOS, useCategories, type CategoryKind } from '../data/categories';
import s from './components.module.css';

/** 입력칸의 마지막 글자(이모지 하나)만 남긴다. 이미 있던 이모지 뒤에 새로 입력하면 새 것으로 바뀐다. */
function lastGrapheme(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const parts =
    'Segmenter' in Intl
      ? Array.from(new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(trimmed), (p) => p.segment)
      : Array.from(trimmed);
  return parts[parts.length - 1];
}

interface CategoryEditorProps {
  /** project: 작품 종류, material: 재료 종류 */
  kind?: CategoryKind;
  /** 없으면 새 종류를 만든다. */
  initial?: Category;
  onDone: (saved?: Category) => void;
}

export function CategoryEditor({ kind = 'project', initial, onDone }: CategoryEditorProps) {
  const { list } = useCategories(kind);
  const repo = CATEGORY_REPOS[kind];
  const [name, setName] = useState(initial?.name ?? '');
  const [emoji, setEmoji] = useState(initial?.emoji ?? '🎀');
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? nextColor(list));
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const duplicate = list.some((c) => c.id !== initial?.id && c.name === trimmed);

  const save = async () => {
    if (!trimmed || duplicate) return;
    setSaving(true);
    try {
      const category: Category = initial
        ? { ...initial, name: trimmed, emoji: emoji || '✨', color }
        : {
            ...newBase(),
            name: trimmed,
            emoji: emoji || '✨',
            color,
            // '기타' 바로 앞에 넣는다.
            order: Math.max(-1, ...list.filter((c) => c.id !== FALLBACK_CATEGORY_ID).map((c) => c.order)) + 1,
          };
      await repo.save(category);
      // 순서를 바꾼 뒤엔 '기타'와 order가 겹칠 수 있어서, '기타'를 맨 뒤로 다시 보낸다.
      const fallback = list.find((c) => c.id === FALLBACK_CATEGORY_ID);
      if (!initial && fallback && fallback.order <= category.order) {
        await repo.save({ ...fallback, order: category.order + 1 });
      }
      onDone(category);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={s.catEditor}>
      <div className={s.catEditorRow}>
        <input
          className={s.catEmojiInput}
          value={emoji}
          onChange={(e) => setEmoji(lastGrapheme(e.target.value))}
          style={{ background: `var(--cat-${color})` }}
          aria-label="이모지"
        />
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void save();
            }
          }}
          placeholder={kind === 'project' ? '종류 이름 (예: 비즈공예)' : '종류 이름 (예: 비즈, 레진)'}
          maxLength={20}
          autoFocus
        />
      </div>
      {duplicate && <p className={s.catError}>이미 같은 이름의 종류가 있어요.</p>}

      <div className={s.emojiGrid} role="group" aria-label="이모지 고르기">
        {EMOJI_SUGGESTIONS.map((e) => (
          <button key={e} type="button" aria-pressed={emoji === e} onClick={() => setEmoji(e)}>
            {e}
          </button>
        ))}
      </div>

      <div className={s.colorDots} role="group" aria-label="색 고르기">
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={color === c}
            aria-label={c}
            onClick={() => setColor(c)}
            style={{ background: `var(--cat-${c})`, color: `var(--cat-${c}-ink)` }}
          />
        ))}
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDone()}>
          취소
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving || !trimmed || duplicate}>
          {initial ? '저장' : '추가'}
        </button>
      </div>
    </div>
  );
}

/** 아직 덜 쓰인 색을 골라준다. */
function nextColor(list: Category[]): CategoryColor {
  const used = new Map<CategoryColor, number>();
  for (const c of list) used.set(c.color, (used.get(c.color) ?? 0) + 1);
  return [...CATEGORY_COLORS].sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0))[0];
}
