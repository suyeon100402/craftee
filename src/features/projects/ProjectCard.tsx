import { Link } from 'react-router';
import type { Project } from '../../data/types';
import { useCategories } from '../../data/categories';
import { formatDate } from '../../lib/date';
import { CategoryBadge, StatusBadge } from '../../components/Badges';
import { PhotoImg } from '../../components/PhotoImg';
import s from './projects.module.css';

export function ProjectCover({ project, className }: { project: Project; className?: string }) {
  const category = useCategories().get(project.category);
  if (project.photoIds[0]) return <PhotoImg id={project.photoIds[0]} alt={project.title} className={className} />;
  return (
    <div className={`${s.coverPlaceholder} ${className ?? ''}`} style={{ background: `var(--cat-${category.color})` }}>
      {category.emoji}
    </div>
  );
}

export function ProjectCard({ project, showStatus = true }: { project: Project; showStatus?: boolean }) {
  const date = project.status === 'done' ? project.finishedAt : project.startedAt;
  return (
    <Link to={`/projects/${project.id}`} className={s.card}>
      <div className={s.cover}>
        <ProjectCover project={project} />
        {showStatus && (
          <span className={s.coverStatus}>
            <StatusBadge status={project.status} />
          </span>
        )}
        {project.photoIds.length > 1 && <span className={s.photoCount}>+{project.photoIds.length - 1}</span>}
      </div>
      <div className={s.cardBody}>
        <p className={s.cardTitle}>{project.title || '이름 없는 작품'}</p>
        <div className={s.cardMeta}>
          <CategoryBadge category={project.category} />
          {date && <span>{formatDate(date)}</span>}
        </div>
      </div>
    </Link>
  );
}
