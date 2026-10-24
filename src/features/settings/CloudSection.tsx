import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { Cloud, Eye, EyeOff, LogOut, RefreshCw } from 'lucide-react';
import { getSyncStatus, signIn, signOut, signUp, subscribeSync, syncNow } from '../../data/cloud/sync';
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
  // first: 처음 쓰는 기기에서 계정 만들기, login: 이미 만든 계정으로 로그인
  const [mode, setMode] = useState<'login' | 'first'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password);
      } else if ((await signUp(email.trim(), password)) === 'needsConfirm') {
        setNotice('확인 메일을 보냈어요. 메일의 링크를 누른 다음, 여기서 로그인해 주세요.');
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 생겼어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className={s.sectionDesc}>
        로그인하면 폰, 패드, PC의 기록과 사진이 자동으로 맞춰져요. 모든 기기에서 같은 이메일과 비밀번호로 로그인하세요.
      </p>
      <div className="chips" role="tablist" aria-label="로그인 방식">
        <button type="button" role="tab" className="chip" aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setError(null); }}>
          로그인
        </button>
        <button type="button" role="tab" className="chip" aria-pressed={mode === 'first'} onClick={() => { setMode('first'); setError(null); }}>
          처음이에요 (계정 만들기)
        </button>
      </div>
      <form className={s.cloudLogin} onSubmit={submit}>
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
        <div className={s.passwordRow}>
          <input
            className="input"
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'login' ? '비밀번호' : '비밀번호 정하기 (6자 이상)'}
            minLength={6}
            required
          />
          <button
            type="button"
            className="icon-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !email.trim() || password.length < 6}>
          {mode === 'login' ? '로그인' : '계정 만들고 시작하기'}
        </button>
      </form>
      {mode === 'first' && (
        <p className={s.sectionDesc}>
          계정은 한 번만 만들면 돼요. 다른 기기에서는 '로그인'으로 같은 이메일과 비밀번호를 넣으세요.
        </p>
      )}
      {busy && <p className="muted">잠시만 기다려 주세요…</p>}
      {notice && <p className={`${s.message} ${s.ok}`}>{notice}</p>}
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
