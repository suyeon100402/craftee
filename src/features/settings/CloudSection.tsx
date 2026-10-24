import { useState, useSyncExternalStore } from 'react';
import { Cloud, LogOut, RefreshCw } from 'lucide-react';
import { getSyncStatus, sendLoginCode, signOut, subscribeSync, syncNow, verifyLoginCode } from '../../data/cloud/sync';
import { useConfirm } from '../../components/ConfirmDialog';
import s from './settings.module.css';

function formatAgo(ts: number | null) {
  if (!ts) return '아직 안 함';
  const min = Math.floor((Date.now() - ts) / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function CloudSection() {
  const status = useSyncExternalStore(subscribeSync, getSyncStatus);

  return (
    <section className={`card ${s.section}`}>
      <h2 className="section-title">☁️ 클라우드 동기화</h2>
      {status.state === 'off' ? (
        <p className={s.sectionDesc}>아직 연결할 서버(Supabase)가 설정되지 않았어요.</p>
      ) : status.state === 'signedOut' ? (
        <LoginForm />
      ) : (
        <SignedIn status={status} />
      )}
    </section>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : '문제가 생겼어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className={s.sectionDesc}>
        로그인하면 폰, 패드, PC의 기록과 사진이 자동으로 맞춰져요. 비밀번호 없이 이메일로 받은 코드로 로그인해요.
      </p>
      {step === 'email' ? (
        <form
          className={s.cloudForm}
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await sendLoginCode(email.trim());
              setStep('code');
            });
          }}
        >
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            required
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !email.trim()}>
            코드 받기
          </button>
        </form>
      ) : (
        <form
          className={s.cloudForm}
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => verifyLoginCode(email.trim(), code));
          }}
        >
          <p className={s.sectionDesc} style={{ width: '100%' }}>
            <strong>{email}</strong>(으)로 보낸 메일의 숫자 코드를 입력해 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.
          </p>
          <input
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="숫자 코드"
            maxLength={10}
            required
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={busy || code.length < 6}>
            로그인
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
            이메일 다시 입력
          </button>
        </form>
      )}
      {busy && <p className="muted">잠시만 기다려 주세요…</p>}
      {error && <p className={`${s.message} ${s.error}`}>{error}</p>}
    </>
  );
}

function SignedIn({ status }: { status: Exclude<ReturnType<typeof getSyncStatus>, { state: 'off' | 'signedOut' }> }) {
  const confirm = useConfirm();
  const syncing = status.state === 'syncing';

  const logout = async () => {
    const ok = await confirm({
      title: '로그아웃할까요?',
      message: '이 기기의 기록은 그대로 남아요. 다시 로그인하면 클라우드와 다시 맞춰요.',
      confirmLabel: '로그아웃',
    });
    if (ok) await signOut();
  };

  return (
    <>
      <p className="row" style={{ fontSize: 14, fontWeight: 600 }}>
        <Cloud size={18} /> {status.email}
      </p>
      <p className={s.sectionDesc}>
        {syncing ? '맞추는 중이에요…' : `마지막 동기화: ${formatAgo(status.lastSyncedAt)}`}
        <br />
        기록을 고치면 몇 초 뒤에 자동으로 맞춰지고, 앱을 다시 열 때도 맞춰져요.
      </p>
      {status.state === 'error' && <p className={`${s.message} ${s.error}`}>{status.message}</p>}
      <div className={s.actions}>
        <button type="button" className="btn btn-primary" onClick={() => void syncNow()} disabled={syncing}>
          <RefreshCw size={18} className={syncing ? s.spin : undefined} /> 지금 동기화
        </button>
        <button type="button" className="btn" onClick={logout} disabled={syncing}>
          <LogOut size={18} /> 로그아웃
        </button>
      </div>
    </>
  );
}
