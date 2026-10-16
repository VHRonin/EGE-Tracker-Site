import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { tabbable } from 'tabbable';
import { Button } from './Button';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  busy = false,
  tone = 'default',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  busy?: boolean;
  tone?: 'default' | 'danger';
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement;
    dialog.showModal();
    // Native dialogs make the background inert, but Tab can reach browser chrome.
    // Keep both directions inside the modal, including forms with radio groups.
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const controls = tabbable(dialog);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener('keydown', trapFocus);
    return () => {
      dialog.removeEventListener('keydown', trapFocus);
      dialog.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
      else document.querySelector<HTMLElement>('main')?.focus();
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={`dialog dialog--${tone}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <p className="dialog__eyebrow" aria-hidden="true">
        {tone === 'danger'
          ? 'Внимание / действие с данными'
          : 'ЕГЭ трекер / лист практики'}
      </p>
      <div className="dialog__header">
        <h2 id={titleId}>{title}</h2>
        <Button
          variant="ghost"
          className="icon-button"
          onClick={onClose}
          aria-label="Закрыть диалог"
          disabled={busy}
        >
          <X size={20} aria-hidden="true" />
        </Button>
      </div>
      {description && (
        <p className="dialog__description" id={descriptionId}>
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}
