import { useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { Button } from './Button';
import { errorMessage } from '../../domain/validation';

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      tone="danger"
      title={title}
      description={description}
    >
      {error && (
        <p className="feedback feedback--error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog__actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Отмена
        </Button>
        <Button variant="danger" disabled={busy} onClick={() => void confirm()}>
          {busy ? 'Выполняем…' : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
