import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Check, Plus, Search, X } from 'lucide-react';
import type { Project, ProjectStatus } from '../../data/types';
import { FALLBACK_CATEGORY_ID, STATUSES } from '../../data/meta';
import { useCategories, useMaterialTypes } from '../../data/categories';
import { useMaterials, useProject } from '../../data/hooks';
import { newBase, projectsRepo } from '../../data/repo';
import { todayStr } from '../../lib/date';
import { PageHeader } from '../../components/PageHeader';
import { PhotoPicker, usePhotoDraft } from '../../components/PhotoPicker';
import { PhotoImg } from '../../components/PhotoImg';
import { TagInput } from '../../components/TagInput';
import { CategoryEditor } from '../../components/CategoryEditor';
import { DateField } from '../../components/DateField';
import { NotFoundPage } from '../../app/NotFoundPage';
import s from './projects.module.css';

const STATUS_VALUES = STATUSES.map((st) => st.value);

function emptyProject(status: ProjectStatus, category: string): Project {
  return {
    ...newBase(),
    title: '',
    category,
    status,
    description: '',
    tags: [],
    photoIds: [],
    materialIds: [],
    links: [],
    startedAt: status === 'planned' ? null : todayStr(),
    finishedAt: status === 'done' ? todayStr() : null,
  };
}

/** 새 작품 만들기와 수정을 함께 처리한다. */
export function ProjectFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const existing = useProject(id);
  // 수정 화면 → 새 작품 화면처럼 같은 화면끼리 이동해도 입력 내용이 남지 않게, 이동할 때마다 새로 그린다.
  const location = useLocation();
  const key = `${location.pathname}${location.search}:${location.key}`;
  const firstCategory = useCategories().list[0]?.id ?? FALLBACK_CATEGORY_ID;

  if (id) {
    if (existing === undefined) return null;
    if (existing === null) return <NotFoundPage message="작품을 찾을 수 없어요" />;
    return <ProjectForm key={key} initial={existing} isNew={false} />;
  }
  const requested = params.get('status') as ProjectStatus;
  const status = STATUS_VALUES.includes(requested) ? requested : 'done';
  return <ProjectForm key={key} initial={emptyProject(status, firstCategory)} isNew />;
}

function ProjectForm({ initial, isNew }: { initial: Project; isNew: boolean }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [linkText, setLinkText] = useState('');
  const [saving, setSaving] = useState(false);
  const photos = usePhotoDraft(initial.photoIds);
  const categories = useCategories().list;
  const [addingCategory, setAddingCategory] = useState(false);

  const set = <K extends keyof Project>(key: K, value: Project[K]) => setForm((f) => ({ ...f, [key]: value }));

  // 계획 → 시작하거나 완성으로 바꾸는 순간에만 빈 날짜를 오늘로 채운다('모름'으로 둔 날짜는 건드리지 않음).
  const changeStatus = (status: ProjectStatus) =>
    setForm((f) => ({
      ...f,
      status,
      startedAt: f.status === 'planned' && status !== 'planned' && !f.startedAt ? todayStr() : f.startedAt,
      finishedAt: f.status !== 'done' && status === 'done' && !f.finishedAt ? todayStr() : f.finishedAt,
    }));

  const addLink = () => {
    let url = linkText.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!form.links.includes(url)) set('links', [...form.links, url]);
    setLinkText('');
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const pendingLink = linkText.trim();
      const links = pendingLink && !form.links.includes(pendingLink) ? [...form.links, pendingLink] : form.links;
      await projectsRepo.save({ ...form, title: form.title.trim(), links, photoIds: photos.ids() }, photos.changes());
      navigate(`/projects/${form.id}`, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  const isPlan = form.status === 'planned';
  const heading = isNew ? (isPlan ? '만들 것 추가' : '작품 기록') : '작품 수정';

  return (
    <>
      <PageHeader title={heading} back />
      <form className={s.form} onSubmit={save}>
        <section className={`card ${s.formSection}`}>
          <PhotoPicker draft={photos} addLabel={isPlan ? '참고 사진' : '사진 추가'} />
          <label className="field">
            <span className="label">이름</span>
            <input
              className="input"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder={isPlan ? '예) 겨울용 꽈배기 목도리' : '예) 토끼 아미구루미'}
              required
              autoFocus={isNew}
            />
          </label>
          <div className="field">
            <span className="label">종류</span>
            <div className="chips-wrap">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="chip"
                  aria-pressed={form.category === c.id}
                  onClick={() => set('category', c.id)}
                >
                  {c.emoji} {c.name}
                </button>
              ))}
              {!addingCategory && (
                <button type="button" className="chip" style={{ borderStyle: 'dashed' }} onClick={() => setAddingCategory(true)}>
                  <Plus size={15} /> 새 종류
                </button>
              )}
            </div>
            {addingCategory && (
              <CategoryEditor
                onDone={(saved) => {
                  setAddingCategory(false);
                  if (saved) set('category', saved.id);
                }}
              />
            )}
          </div>
          <div className="field">
            <span className="label">상태</span>
            <div className="chips-wrap">
              {STATUSES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  className="chip"
                  aria-pressed={form.status === st.value}
                  onClick={() => changeStatus(st.value)}
                >
                  {st.emoji} {st.label}
                </button>
              ))}
            </div>
          </div>
          {!isPlan && (
            <div className={s.twoCol}>
              <DateField label="시작한 날" value={form.startedAt} onChange={(v) => set('startedAt', v)} />
              {form.status === 'done' && (
                <DateField label="완성한 날" value={form.finishedAt} onChange={(v) => set('finishedAt', v)} />
              )}
            </div>
          )}
        </section>

        <section className={`card ${s.formSection}`}>
          <label className="field">
            <span className="label">{isPlan ? '메모 (아이디어, 크기, 참고할 점)' : '이야기 (만든 과정, 느낀 점, 도안 정보)'}</span>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={isPlan ? '어떤 걸 만들고 싶은지 자유롭게 적어 보세요.' : '이 작품에 대해 자유롭게 적어 보세요.'}
            />
          </label>
          <div className="field">
            <span className="label">태그</span>
            <TagInput value={form.tags} onChange={(tags) => set('tags', tags)} placeholder="예) 선물, 겨울, 아미구루미" />
          </div>
          <div className="field">
            <span className="label">도안·참고 링크</span>
            {form.links.map((url) => (
              <div key={url} className={s.linkRow}>
                <input className="input" value={url} readOnly />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => set('links', form.links.filter((l) => l !== url))}
                  aria-label="링크 빼기"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
            <div className={s.linkRow}>
              <input
                className="input"
                type="url"
                inputMode="url"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLink();
                  }
                }}
                placeholder="https://"
              />
              <button type="button" className="btn" onClick={addLink}>
                추가
              </button>
            </div>
          </div>
        </section>

        <section className={`card ${s.formSection}`}>
          <MaterialPicker value={form.materialIds} onChange={(ids) => set('materialIds', ids)} />
        </section>

        <div className={s.formActions}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || photos.busy || !form.title.trim()}>
            저장하기
          </button>
        </div>
      </form>
    </>
  );
}

function MaterialPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const materials = useMaterials() ?? [];
  const materialTypes = useMaterialTypes();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = materials.filter((m) =>
    !q ? true : [m.name, m.brand, m.color, ...m.tags].some((v) => v.toLowerCase().includes(q)),
  );
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="field">
      <span className="label">
        {value.length ? `사용한·필요한 재료 (${value.length}개 선택)` : '사용한·필요한 재료'}
      </span>
      {materials.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>
          재료 보관함에 재료를 등록하면 여기서 고를 수 있어요.
        </p>
      ) : (
        <>
          {materials.length > 6 && (
            <div className="row">
              <Search size={18} className="muted" />
              <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="재료 찾기" />
            </div>
          )}
          <div className={s.materialList}>
            {shown.map((m) => (
              <button
                key={m.id}
                type="button"
                className={s.materialOption}
                aria-pressed={value.includes(m.id)}
                onClick={() => toggle(m.id)}
              >
                <span className={s.materialThumb}>
                  {m.photoIds[0] ? <PhotoImg id={m.photoIds[0]} /> : materialTypes.get(m.type).emoji}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <strong>{m.name}</strong>
                  <br />
                  <small className="muted">{[m.brand, m.color].filter(Boolean).join(' · ') || materialTypes.get(m.type).name}</small>
                </span>
                {value.includes(m.id) && <Check size={18} />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
