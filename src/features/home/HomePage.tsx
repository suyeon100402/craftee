import { Link } from 'react-router';
import { ChevronRight, CloudDownload } from 'lucide-react';
import { useMaterials, useProjects, useSetting } from '../../data/hooks';
import { LAST_BACKUP_KEY } from '../../data/backup';
import { daysSince } from '../../lib/date';
import { CategoryBadge } from '../../components/Badges';
import { EmptyState } from '../../components/EmptyState';
import { ProjectCard, ProjectCover } from '../projects/ProjectCard';
import { BrandMark } from '../../theme/mascots';
import s from './home.module.css';

const BACKUP_REMIND_DAYS = 14;

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '늦은 밤에도 손이 바쁘네요 🌙';
  if (h < 12) return '좋은 아침이에요 ☀️';
  if (h < 18) return '오늘은 뭘 만들어 볼까요? 🧶';
  return '오늘 하루도 수고했어요 🌷';
}

export function HomePage() {
  const projects = useProjects();
  const materials = useMaterials();
  const lastBackupAt = useSetting<number>(LAST_BACKUP_KEY);

  if (projects === undefined || materials === undefined) return null;

  const inProgress = projects.filter((p) => p.status === 'in_progress');
  const done = projects
    .filter((p) => p.status === 'done')
    .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '') || b.updatedAt - a.updatedAt);
  const planned = projects.filter((p) => p.status === 'planned');
  const isEmpty = projects.length === 0 && materials.length === 0;

  const needsBackup =
    !isEmpty && lastBackupAt !== undefined && (lastBackupAt === null || daysSince(lastBackupAt) >= BACKUP_REMIND_DAYS);

  const stats = [
    { label: '완성', value: done.length, to: '/works?status=done', bg: 'var(--status-done)', ink: 'var(--status-done-ink)' },
    { label: '진행 중', value: inProgress.length, to: '/works?status=in_progress', bg: 'var(--status-in_progress)', ink: 'var(--status-in_progress-ink)' },
    { label: '계획', value: planned.length, to: '/plans', bg: 'var(--status-planned)', ink: 'var(--status-planned-ink)' },
    { label: '재료', value: materials.length, to: '/materials', bg: 'var(--cat-lavender)', ink: 'var(--cat-lavender-ink)' },
  ];

  return (
    <>
      <header className={s.hero}>
        <BrandMark className={s.heroMark} />
        <div>
          <h1 className={s.heroTitle}>Craftee</h1>
          <p className={s.heroSub}>{greeting()}</p>
        </div>
      </header>

      {isEmpty ? (
        <section className={s.welcome}>
          <EmptyState
            title="나만의 만들기 기록장을 시작해요"
            description="완성한 작품, 만들고 싶은 것, 가진 재료를 모두 한곳에 모아 보세요."
          />
          <div className={s.welcomeActions}>
            <Link to="/projects/new?status=done" className={`card ${s.welcomeCard}`}>
              <span style={{ background: 'var(--cat-pink)' }}>🎉</span>
              완성한 작품 기록하기
            </Link>
            <Link to="/projects/new?status=planned" className={`card ${s.welcomeCard}`}>
              <span style={{ background: 'var(--status-planned)' }}>💭</span>
              만들고 싶은 것 적기
            </Link>
            <Link to="/materials/new" className={`card ${s.welcomeCard}`}>
              <span style={{ background: 'var(--cat-butter)' }}>🧺</span>
              가진 재료 등록하기
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className={s.stats}>
            {stats.map((st) => (
              <Link key={st.label} to={st.to} className={s.stat} style={{ background: st.bg, color: st.ink }}>
                <span className={s.statNum}>{st.value}</span>
                <span className={s.statLabel}>{st.label}</span>
              </Link>
            ))}
          </div>

          <Link to="/random" className={`card ${s.randomCard}`}>
            <span className={s.randomDice}>🎲</span>
            <span style={{ flex: 1 }}>
              <strong>오늘 뭐 만들지?</strong>
              <small>다음 작품이나 재료를 랜덤으로 뽑아 봐요</small>
            </span>
            <ChevronRight size={18} className="muted" />
          </Link>

          {needsBackup && (
            <Link to="/settings" className={s.reminder}>
              <CloudDownload size={22} style={{ flex: 'none' }} />
              <span style={{ flex: 1 }}>
                {lastBackupAt ? `마지막 백업이 ${daysSince(lastBackupAt)}일 전이에요.` : '아직 백업을 한 적이 없어요.'} 소중한 기록을 백업 파일로 저장해 두세요.
              </span>
              <ChevronRight size={18} />
            </Link>
          )}

          {inProgress.length > 0 && (
            <section className={s.section}>
              <div className={s.sectionHead}>
                <h2 className="section-title">🪡 만들고 있어요</h2>
                <Link to="/works?status=in_progress" className={s.more}>
                  전체 보기
                </Link>
              </div>
              <div className={s.scroller}>
                {inProgress.map((p) => (
                  <ProjectCard key={p.id} project={p} showStatus={false} />
                ))}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section className={s.section}>
              <div className={s.sectionHead}>
                <h2 className="section-title">🎉 최근 완성</h2>
                <Link to="/works?status=done" className={s.more}>
                  전체 보기
                </Link>
              </div>
              <div className="card-grid">
                {done.slice(0, 6).map((p) => (
                  <ProjectCard key={p.id} project={p} showStatus={false} />
                ))}
              </div>
            </section>
          )}

          {planned.length > 0 && (
            <section className={s.section}>
              <div className={s.sectionHead}>
                <h2 className="section-title">💭 만들 예정</h2>
                <Link to="/plans" className={s.more}>
                  전체 보기
                </Link>
              </div>
              <div className={s.planList}>
                {planned.slice(0, 4).map((p) => (
                  <Link key={p.id} to={`/projects/${p.id}`} className={`card ${s.planItem}`}>
                    <span className={s.planThumb}>
                      <ProjectCover project={p} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block' }}>{p.title}</strong>
                      <CategoryBadge category={p.category} />
                    </span>
                    <ChevronRight size={18} className="muted" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
