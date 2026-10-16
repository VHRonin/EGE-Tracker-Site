import { useRef, useState } from 'react';
import { errorMessage } from '../domain/validation';

export function useMutation() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run<T>(
    action: () => Promise<T>,
    onSuccess: (value: T) => void,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      onSuccess(await action());
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run };
}
