import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { useAllTags } from '../data/hooks';
import s from './components.module.css';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

/** 엔터나 쉼표로 태그를 추가한다. 전에 쓴 태그는 자동완성으로 보여준다. */
export function TagInput({ value, onChange, placeholder = '태그 입력 후 엔터' }: TagInputProps) {
  const [text, setText] = useState('');
  const listId = useId();
  const allTags = useAllTags() ?? [];

  const add = (raw: string) => {
    const tag = raw.trim().replace(/^#/, '');
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setText('');
  };

  return (
    <div className={s.tagInput}>
      {value.map((tag) => (
        <span key={tag} className={s.tagChip}>
          #{tag}
          <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`${tag} 태그 빼기`}>
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        value={text}
        list={listId}
        placeholder={value.length ? '' : placeholder}
        enterKeyHint="done"
        onChange={(e) => {
          const next = e.target.value;
          if (next.endsWith(',')) add(next.slice(0, -1));
          else setText(next);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            add(text);
          } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => text && add(text)}
      />
      <datalist id={listId}>
        {allTags
          .filter((t) => !value.includes(t))
          .map((t) => (
            <option key={t} value={t} />
          ))}
      </datalist>
    </div>
  );
}
