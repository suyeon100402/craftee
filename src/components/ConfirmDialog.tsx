import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import s from './components.module.css';

interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** 지우기처럼 되돌릴 수 없는 동작이면 빨간 버튼으로 보여준다. */
  danger?: boolean;
  /** 안내만 할 때(확인 버튼 하나) */
  alertOnly?: boolean;
}

type OpenDialog = (options: DialogOptions) => Promise<boolean>;

const DialogContext = createContext<OpenDialog | null>(null);

/*
 * 브라우저 기본 confirm()/alert() 대신 쓰는 앱 안 확인 창.
 * 기본 창은 앱 안 브라우저나 일부 설치형 앱(PWA)에서 막혀서 바로 '취소'로 처리되기 때문이다.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<(DialogOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const open = useCallback<OpenDialog>(
    (options) => new Promise((resolve) => setCurrent({ ...options, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    current?.resolve(ok);
    setCurrent(null);
  };

  return (
    <DialogContext.Provider value={open}>
      {children}
      {current && <Dialog options={current} onClose={close} />}
    </DialogContext.Provider>
  );
}

function Dialog({ options, onClose }: { options: DialogOptions; onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={s.dialogBackdrop} onClick={() => onClose(false)}>
      <div
        className={s.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="dialog-title" className={s.dialogTitle}>
          {options.title}
        </p>
        {options.message && <p className={s.dialogMessage}>{options.message}</p>}
        <div className={s.dialogActions}>
          {!options.alertOnly && (
            <button type="button" className="btn" onClick={() => onClose(false)}>
              취소
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            className={`btn ${options.danger ? s.dialogDanger : 'btn-primary'}`}
            onClick={() => onClose(true)}
          >
            {options.confirmLabel ?? '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** const confirm = useConfirm(); if (await confirm({ title: '지울까요?', danger: true })) ... */
export function useConfirm(): OpenDialog {
  const open = useContext(DialogContext);
  if (!open) throw new Error('DialogProvider 안에서만 쓸 수 있어요.');
  return open;
}
