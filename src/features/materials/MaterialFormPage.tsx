import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, X } from 'lucide-react';
import type { Material } from '../../data/types';
import { FALLBACK_CATEGORY_ID } from '../../data/meta';
import { useMaterialTypes } from '../../data/categories';
import { CategoryEditor } from '../../components/CategoryEditor';
import { useMaterial } from '../../data/hooks';
import { materialsRepo, newBase } from '../../data/repo';
import { PageHeader } from '../../components/PageHeader';
import { PhotoPicker, usePhotoDraft } from '../../components/PhotoPicker';
import { TagInput } from '../../components/TagInput';
import { NotFoundPage } from '../../app/NotFoundPage';
import ps from '../projects/projects.module.css';
import s from './materials.module.css';

function emptyMaterial(type: string): Material {
  return {
    ...newBase(),
    type,
    name: '',
    brand: '',
    color: '',
    colorHex: null,
    quantity: '',
    note: '',
    tags: [],
    photoIds: [],
  };
}

export function MaterialFormPage() {
  const { id } = useParams();
  const existing = useMaterial(id);
  const firstType = useMaterialTypes().list[0]?.id ?? FALLBACK_CATEGORY_ID;

  if (id) {
    if (existing === undefined) return null;
    if (existing === null) return <NotFoundPage message="재료를 찾을 수 없어요" />;
    return <MaterialForm initial={existing} isNew={false} />;
  }
  return <MaterialForm initial={emptyMaterial(firstType)} isNew />;
}

// 기본 재료 종류의 이름 예시(직접 만든 종류는 '이름'으로 보여준다)
const NAME_PLACEHOLDER: Partial<Record<string, string>> = {
  yarn: '예) 메리노 울 합사',
  needle: '예) 대바늘 5mm',
  block: '예) 2x4 브릭 핑크',
  fabric: '예) 극세사 원단 아이보리',
  stuffing: '예) 방울솜',
  notion: '예) 인형 눈 10mm',
  tool: '예) 단수링',
};

function MaterialForm({ initial, isNew }: { initial: Material; isNew: boolean }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const photos = usePhotoDraft(initial.photoIds);
  const materialTypes = useMaterialTypes().list;
  const [addingType, setAddingType] = useState(false);

  const set = <K extends keyof Material>(key: K, value: Material[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await materialsRepo.save(
        {
          ...form,
          name: form.name.trim(),
          brand: form.brand.trim(),
          color: form.color.trim(),
          quantity: form.quantity.trim(),
          photoIds: photos.ids(),
        },
        photos.changes(),
      );
      navigate(`/materials/${form.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={isNew ? '재료 등록' : '재료 수정'} back />
      <form className={ps.form} onSubmit={save}>
        <section className={`card ${ps.formSection}`}>
          <div className="field">
            <span className="label">종류</span>
            <div className={s.typeGrid}>
              {materialTypes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={s.typeOption}
                  aria-pressed={form.type === t.id}
                  onClick={() => set('type', t.id)}
                >
                  <span>{t.emoji}</span>
                  {t.name}
                </button>
              ))}
              {!addingType && (
                <button type="button" className={`${s.typeOption} ${s.typeAdd}`} onClick={() => setAddingType(true)}>
                  <span>
                    <Plus size={22} />
                  </span>
                  새 종류
                </button>
              )}
            </div>
            {addingType && (
              <CategoryEditor
                kind="material"
                onDone={(saved) => {
                  setAddingType(false);
                  if (saved) set('type', saved.id);
                }}
              />
            )}
          </div>
          <PhotoPicker draft={photos} />
          <label className="field">
            <span className="label">이름</span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={NAME_PLACEHOLDER[form.type] ?? '이름'}
              required
              autoFocus={isNew}
            />
          </label>
          <div className={ps.twoCol}>
            <label className="field">
              <span className="label">브랜드</span>
              <input className="input" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
            </label>
            <label className="field">
              <span className="label">수량</span>
              <input
                className="input"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="예) 3볼, 1쌍"
              />
            </label>
          </div>
          <div className="field">
            <span className="label">색상</span>
            <div className={s.colorRow}>
              <input
                type="color"
                className={s.colorInput}
                value={form.colorHex ?? '#f5afc2'}
                onChange={(e) => set('colorHex', e.target.value)}
                aria-label="색 고르기"
              />
              <input
                className="input"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                placeholder="예) 연핑크, 23번 아이보리"
              />
              {form.colorHex && (
                <button type="button" className="icon-btn" onClick={() => set('colorHex', null)} aria-label="색 지우기">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        </section>

        <section className={`card ${ps.formSection}`}>
          <label className="field">
            <span className="label">메모</span>
            <textarea
              className="textarea"
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              placeholder="산 곳, 가격, 굵기, 세탁 방법 등"
            />
          </label>
          <div className="field">
            <span className="label">태그</span>
            <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} />
          </div>
        </section>

        <div className={ps.formActions}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || photos.busy || !form.name.trim()}>
            저장하기
          </button>
        </div>
      </form>
    </>
  );
}
