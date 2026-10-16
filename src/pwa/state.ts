import { useSyncExternalStore } from 'react';
import { publicAsset } from '../shared/assets';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
interface PwaState {
  ready: boolean;
  online: boolean;
  updateAvailable: boolean;
  installAvailable: boolean;
  error: boolean;
  supported: boolean;
}
let snapshot: PwaState = {
  ready: false,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  updateAvailable: false,
  installAvailable: false,
  error: false,
  supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
};
const listeners = new Set<() => void>();
let registration: ServiceWorkerRegistration | undefined;
let installEvent: InstallEvent | undefined;
function update(values: Partial<PwaState>) {
  snapshot = { ...snapshot, ...values };
  listeners.forEach((listener) => listener());
}
export function usePwa() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}

export function registerPwa() {
  window.addEventListener('online', () => update({ online: true }));
  window.addEventListener('offline', () => update({ online: false }));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event as InstallEvent;
    update({ installAvailable: true });
  });
  window.addEventListener('appinstalled', () => {
    installEvent = undefined;
    update({ installAvailable: false });
  });
  if (!import.meta.env.PROD || !snapshot.supported) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) window.location.reload();
    else update({ ready: true });
  });
  void navigator.serviceWorker
    .register(publicAsset('sw.js'), { scope: import.meta.env.BASE_URL })
    .then((value) => {
      registration = value;
      update({ updateAvailable: Boolean(value.waiting) });
      navigator.serviceWorker.ready.then(() => update({ ready: true }));
      value.addEventListener('updatefound', () => {
        const worker = value.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed')
            update({
              updateAvailable: Boolean(navigator.serviceWorker.controller),
            });
        });
      });
      // Reload only after an explicit click, preserving an in-progress form otherwise.
      applyUpdate = () => {
        if (value.waiting) {
          reloading = true;
          value.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      };
    })
    .catch(() => update({ error: true }));
}

let applyUpdate = () => {};
export function updateApp() {
  applyUpdate();
}
export async function installApp() {
  if (!installEvent) return;
  const event = installEvent;
  installEvent = undefined;
  update({ installAvailable: false });
  await event.prompt();
  await event.userChoice;
}
export async function checkForUpdate() {
  try {
    await registration?.update();
  } catch {
    update({ error: true });
  }
}
