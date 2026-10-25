import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Download, Pencil, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router';
import { useCurrentTheme } from '../../theme/mascots';
import { LAST_BACKUP_KEY, exportBackup, importBackup } from '../../data/backup';
import { useSetting, useTrash } from '../../data/hooks';
import { CATEGORY_REPOS, useCategories, type CategoryKind } from '../../data/categories';
import { FALLBACK_CATEGORY_ID } from '../../data/meta';
import { CategoryEditor } from '../../components/CategoryEditor';
import { useConfirm } from '../../components/ConfirmDialog';
import { compactToday, formatTimestamp } from '../../lib/date';
import { PageHeader } from '../../components/PageHeader';
import { CloudSection } from './CloudSection';
import s from './settings.module.css';

export function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" />
      <div className={s.page}>
        <ThemeSection />
        <CategorySection kind="project" />
        <CategorySection kind="material" />
        <TrashLink />
        <CloudSection />
        <BackupSection />
        <StorageSection />
        <InstallSection />
        <p className="muted" style={{ fontSize: 13, textAlign: 'center' }}>
          Craftee v{__APP_VERSION__} · 모든 기록은 이 기기 안에만 저장돼요
        </p>
      </div>
    </>
  );
}

/** 지금 테마를 보여주고, 누르면 테마 고르기 페이지로 간다. */
function ThemeSection() {
  const theme = useCurrentTheme();
  return (
    <Link to="/settings/themes" className={`card ${s.section} ${s.linkCard}`}>
      <h2 className="section-title">🎨 테마</h2>
      <span className={s.swatches} aria-hidden="true">
        {theme.swatches.slice(0, 3).map((c) => (
          <span key={c} style={{ background: c }} />
        ))}
      </span>
      <span className="muted" style={{ fontSize: 14, marginLeft: 8 }}>
        {theme.name}
      </span>
      <ChevronRight size={20} className="muted" />
    </Link>
  );
}

const CATEGORY_SECTION_TEXT: Record<CategoryKind, { title: string; desc: string; unit: string }> = {
  project: { title: '🏷️ 작품 종류', desc: '작품을 나누는 종류를 추가하거나 이름, 이모지, 색을 바꿀 수 있어요.', unit: '작품' },
  material: { title: '🧺 재료 종류', desc: '재료 보관함에서 쓰는 종류(실, 바늘 등)를 추가하거나 바꿀 수 있어요.', unit: '재료' },
};

function CategorySection({ kind }: { kind: CategoryKind }) {
  const { list } = useCategories(kind);
  const repo = CATEGORY_REPOS[kind];
  const text = CATEGORY_SECTION_TEXT[kind];
  // 'new' = 새 종류 추가 중, 문자열 = 그 id의 종류 수정 중
  const [editing, setEditing] = useState<string | null>(null);
  const confirm = useConfirm();

  const move = (index: number, delta: number) => {
    const ids = list.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    void repo.reorder(ids);
  };

  const remove = async (id: string, name: string) => {
    const count = await repo.countUsage(id);
    const ok = await confirm({
      title: `'${name}' 종류를 지울까요?`,
      message: count ? `이 종류인 ${text.unit} ${count}개는 '기타'로 옮겨져요.` : undefined,
      confirmLabel: '지우기',
      danger: true,
    });
    if (ok) await repo.remove(id);
  };

  return (
    <section className={`card ${s.section}`}>
      <h2 className="section-title">{text.title}</h2>
      <p className={s.sectionDesc}>{text.desc}</p>
      <ul className={s.catList}>
        {list.map((c, i) =>
          editing === c.id ? (
            <li key={c.id}>
              <CategoryEditor kind={kind} initial={c} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={c.id} className={s.catRow}>
              <span className={s.catEmoji} style={{ background: `var(--cat-${c.color})` }}>
                {c.emoji}
              </span>
              <span className={s.catName}>{c.name}</span>
              <button type="button" className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">
                <ChevronUp size={18} />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => move(i, 1)}
                disabled={i === list.length - 1}
                aria-label="아래로"
              >
                <ChevronDown size={18} />
              </button>
              <button type="button" className="icon-btn" onClick={() => setEditing(c.id)} aria-label={`${c.name} 수정`}>
                <Pencil size={17} />
              </button>
              {c.id !== FALLBACK_CATEGORY_ID ? (
                <button type="button" className="icon-btn" onClick={() => remove(c.id, c.name)} aria-label={`${c.name} 삭제`}>
                  <Trash2 size={17} />
                </button>
              ) : (
                <span className={s.catKeep} title="'기타'는 지울 수 없어요" />
              )}
            </li>
          ),
        )}
      </ul>
      {editing === 'new' ? (
        <CategoryEditor kind={kind} onDone={() => setEditing(null)} />
      ) : (
        <div>
          <button type="button" className="btn" onClick={() => setEditing('new')}>
            <Plus size={18} /> 종류 추가
          </button>
        </div>
      )}
    </section>
  );
}

function TrashLink() {
  const count = useTrash()?.length ?? 0;
  return (
    <Link to="/trash" className={`card ${s.section} ${s.linkCard}`}>
      <h2 className="section-title">🗑️ 휴지통</h2>
      <span className="muted" style={{ fontSize: 14 }}>{count ? `${count}개` : '비어 있음'}</span>
      <ChevronRight size={20} className="muted" />
    </Link>
  );
}

function BackupSection() {
  const lastBackupAt = useSetting<number>(LAST_BACKUP_KEY);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const doExport = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const blob = await exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `craftee-backup-${compactToday()}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setMessage({ ok: true, text: '백업 파일을 만들었어요. 클라우드 드라이브나 PC 같은 안전한 곳에 보관해 두세요.' });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : '백업에 실패했어요.' });
    } finally {
      setBusy(false);
    }
  };

  const doImport = async (file: File) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await importBackup(file);
      setMessage({
        ok: true,
        text:
          result.records + result.photos === 0
            ? '이미 모두 들어 있는 기록이에요. 바뀐 게 없어요.'
            : `불러오기 완료! 기록 ${result.records}개, 사진 ${result.photos}장을 합쳤어요.`,
      });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : '불러오기에 실패했어요.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`card ${s.section}`}>
      <h2 className="section-title">💾 백업</h2>
      <p className={s.sectionDesc}>
        기록은 이 기기의 브라우저 안에만 있어요. 브라우저 데이터를 지우거나 기기를 바꾸면 사라질 수 있으니 가끔 백업 파일로
        저장해 두세요. 백업 파일을 다른 기기에서 불러오면 기록을 옮길 수 있어요. 불러오기는 덮어쓰지 않고 합쳐요.
      </p>
      <p style={{ fontSize: 14, fontWeight: 600 }}>
        마지막 백업: {lastBackupAt ? formatTimestamp(lastBackupAt) : '아직 없어요'}
      </p>
      <div className={s.actions}>
        <button type="button" className="btn btn-primary" onClick={doExport} disabled={busy}>
          <Download size={18} /> 백업 파일 만들기
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload size={18} /> 백업 불러오기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void doImport(file);
            e.target.value = '';
          }}
        />
      </div>
      {busy && <p className="muted">잠시만 기다려 주세요…</p>}
      {message && <p className={`${s.message} ${message.ok ? s.ok : s.error}`}>{message.text}</p>}
    </section>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
}

function StorageSection() {
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 0 }));
    navigator.storage?.persisted?.().then(setPersisted);
  }, []);

  const requestPersist = async () => {
    const granted = (await navigator.storage?.persist?.()) ?? false;
    setPersisted(granted);
    if (!granted) {
      await confirm({
        title: '보호 요청이 거절됐어요',
        message: '앱을 홈 화면에 설치하면 허용되는 경우가 많아요.',
        alertOnly: true,
      });
    }
  };

  return (
    <section className={`card ${s.section}`}>
      <h2 className="section-title">📦 저장 공간</h2>
      {estimate && estimate.quota > 0 ? (
        <>
          <div className={s.meter} aria-hidden="true">
            <span style={{ width: `${Math.max(1, (estimate.usage / estimate.quota) * 100)}%` }} />
          </div>
          <p className={s.sectionDesc}>
            {formatBytes(estimate.usage)} 사용 중 · 약 {formatBytes(estimate.quota)}까지 쓸 수 있어요
          </p>
        </>
      ) : (
        <p className={s.sectionDesc}>이 브라우저에서는 사용량을 확인할 수 없어요.</p>
      )}
      {persisted !== null &&
        (persisted ? (
          <p className="row" style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-done-ink)' }}>
            <ShieldCheck size={18} /> 브라우저가 기록을 자동으로 지우지 않도록 보호 중이에요
          </p>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            <p className={s.sectionDesc}>
              저장 공간이 부족해지면 브라우저가 오래된 데이터를 지울 수 있어요. 보호를 요청하면 지우지 않도록 할 수 있어요.
            </p>
            <div>
              <button type="button" className="btn" onClick={requestPersist}>
                <ShieldCheck size={18} /> 기록 보호 요청하기
              </button>
            </div>
          </div>
        ))}
    </section>
  );
}

function InstallSection() {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return (
    <section className={`card ${s.section}`}>
      <h2 className="section-title">📱 앱으로 설치하기</h2>
      {standalone ? (
        <p className={s.sectionDesc}>앱으로 설치되어 있어요. 인터넷이 없어도 쓸 수 있어요 ✨</p>
      ) : (
        <>
          <p className={s.sectionDesc}>
            홈 화면에 추가하면 앱처럼 열리고 인터넷이 없어도 쓸 수 있어요. 아이폰에서는 기록을 안전하게 지키기 위해 꼭 설치해서
            쓰는 걸 추천해요.
          </p>
          <div>
            <strong style={{ fontSize: 14 }}>아이폰 (Safari)</strong>
            <ol className={s.steps}>
              <li>아래쪽 공유 버튼(□↑)을 눌러요</li>
              <li>"홈 화면에 추가"를 눌러요</li>
            </ol>
          </div>
          <div>
            <strong style={{ fontSize: 14 }}>안드로이드 (Chrome)</strong>
            <ol className={s.steps}>
              <li>오른쪽 위 ⋮ 메뉴를 눌러요</li>
              <li>"앱 설치" 또는 "홈 화면에 추가"를 눌러요</li>
            </ol>
          </div>
          <div>
            <strong style={{ fontSize: 14 }}>PC (Chrome / Edge)</strong>
            <ol className={s.steps}>
              <li>주소창 오른쪽의 설치 아이콘을 눌러요</li>
            </ol>
          </div>
        </>
      )}
    </section>
  );
}
