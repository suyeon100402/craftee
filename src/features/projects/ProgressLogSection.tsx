import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ProgressLog } from '../../data/types';
import { useProgressLogs } from '../../data/hooks';
import { newBase, progressLogsRepo } from '../../data/repo';
import { formatDate, todayStr } from '../../lib/date';
import { PhotoPicker, usePhotoDraft } from '../../components/PhotoPicker';
import { PhotoImg } from '../../components/PhotoImg';
import { Lightbox } from '../../components/PhotoGallery';
import { useConfirm } from '../../components/ConfirmDialog';
import s from './projects.module.css';

/** 작품의 진행 기록 타임라인 */
export function ProgressLogSection({ projectId }: { projectId: string }) {
  const logs = useProgressLogs(projectId);
  const [editing, setEditing] = useState<ProgressLog | 'new' | null>(null);
  const [viewer, setViewer] = useState<{ ids: string[]; index: number } | null>(null);
  const confirm = useConfirm();

  const remove = async (log: ProgressLog) => {
    const ok = await confirm({ title: '이 기록을 지울까요?', message: '진행 기록은 휴지통에 남지 않고 바로 지워져요.', confirmLabel: '지우기', danger: true });
    if (ok) await progressLogsRepo.remove(log.id);
  };

  return (
    <section>
      <div className="row">
        <h3 className="section-title">📝 진행 기록</h3>
        <span className="spacer" />
        {editing === null && (
          <button type="button" className="btn btn-sm" onClick={() => setEditing('new')}>
            <Plus size={16} /> 기록 추가
          </button>
        )}
      </div>

      {editing === 'new' && (
        <LogForm projectId={projectId} onDone={() => setEditing(null)} />
      )}

      {logs && logs.length === 0 && editing === null && (
        <p className="muted" style={{ marginTop: 8 }}>
          오늘 얼마나 했는지, 막힌 부분이나 바꾼 점을 짧게 남겨 보세요.
        </p>
      )}

      <div className={s.timeline}>
        {logs?.map((log) =>
          editing !== 'new' && editing?.id === log.id ? (
            <LogForm key={log.id} projectId={projectId} log={log} onDone={() => setEditing(null)} />
          ) : (
            <div key={log.id} className={s.logItem}>
              <div className={s.logHead}>
                {formatDate(log.date)}
                <span className="spacer" />
                <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setEditing(log)} aria-label="기록 수정">
                  <Pencil size={15} />
                </button>
                <button type="button" className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => remove(log)} aria-label="기록 삭제">
                  <Trash2 size={15} />
                </button>
              </div>
              {log.text && <p className={s.logText}>{log.text}</p>}
              {log.photoIds.length > 0 && (
                <div className={s.logPhotos}>
                  {log.photoIds.map((id, i) => (
                    <button key={id} type="button" className={s.logPhoto} onClick={() => setViewer({ ids: log.photoIds, index: i })}>
                      <PhotoImg id={id} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {viewer && <Lightbox photoIds={viewer.ids} start={viewer.index} onClose={() => setViewer(null)} />}
    </section>
  );
}

function LogForm({ projectId, log, onDone }: { projectId: string; log?: ProgressLog; onDone: () => void }) {
  const [date, setDate] = useState(log?.date ?? todayStr());
  const [text, setText] = useState(log?.text ?? '');
  const photos = usePhotoDraft(log?.photoIds ?? []);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim() && photos.items.length === 0) return;
    setSaving(true);
    try {
      await progressLogsRepo.save(
        { ...(log ?? { ...newBase(), projectId }), date, text: text.trim(), photoIds: photos.ids() },
        photos.changes(),
      );
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`card ${s.logForm}`}>
      <label className="field">
        <span className="label">날짜</span>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value || todayStr())} />
      </label>
      <label className="field">
        <span className="label">기록</span>
        <textarea
          className="textarea"
          style={{ minHeight: 90 }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="예) 몸판 20단까지 완료! 코 줄이는 부분이 헷갈렸다."
          autoFocus={!log}
        />
      </label>
      <PhotoPicker draft={photos} />
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          취소
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={save}
          disabled={saving || photos.busy || (!text.trim() && photos.items.length === 0)}
        >
          저장
        </button>
      </div>
    </div>
  );
}
