import { Link } from 'react-router';
import type { Material } from '../../data/types';
import { useMaterialTypes } from '../../data/categories';
import { PhotoImg } from '../../components/PhotoImg';
import s from './materials.module.css';

export function MaterialCard({ material }: { material: Material }) {
  const type = useMaterialTypes().get(material.type);
  return (
    <Link to={`/materials/${material.id}`} className={`${s.card} ${material.usedUp ? s.usedUp : ''}`}>
      <div className={s.thumb} style={material.photoIds[0] ? undefined : { background: material.colorHex ?? `var(--cat-${type.color})` }}>
        {material.photoIds[0] ? <PhotoImg id={material.photoIds[0]} alt={material.name} /> : type.emoji}
        {material.photoIds[0] && material.colorHex && <span className={s.swatch} style={{ background: material.colorHex }} />}
      </div>
      {material.usedUp && <span className={s.usedUpBadge}>다 씀</span>}
      <div className={s.body}>
        <p className={s.name}>{material.name}</p>
        <p className={s.sub}>{[type.name, material.brand, material.color].filter(Boolean).join(' · ')}</p>
        {material.quantity && <span className={`tag ${s.qty}`}>{material.quantity}</span>}
      </div>
    </Link>
  );
}
