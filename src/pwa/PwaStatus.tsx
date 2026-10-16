import { Download, RefreshCw, WifiOff } from 'lucide-react';
import { usePwa, installApp, updateApp, checkForUpdate } from './state';
import { Button } from '../shared/ui/Button';
import { Badge } from '../shared/ui/Badge';

export function PwaBanner() {
  const state = usePwa();
  if (!state.updateAvailable && state.online) return null;
  return (
    <div className="pwa-banner" role="status">
      {!state.online && (
        <p>
          <WifiOff size={16} aria-hidden="true" />
          Офлайн.{' '}
          {state.ready
            ? 'Трекер и локальные данные доступны.'
            : 'Для первой загрузки нужна сеть.'}
        </p>
      )}
      {state.updateAvailable && (
        <div>
          <p>
            Доступна новая версия. Сохраните открытую форму перед обновлением.
          </p>
          <Button variant="secondary" onClick={updateApp}>
            <RefreshCw size={16} aria-hidden="true" />
            Обновить приложение
          </Button>
        </div>
      )}
    </div>
  );
}

export function PwaSettings() {
  const state = usePwa();
  return (
    <section className="card pwa-settings" aria-labelledby="pwa-title">
      <h2 id="pwa-title">Приложение и офлайн</h2>
      <Badge tone={state.ready ? 'success' : 'neutral'}>
        {state.ready
          ? 'Готово к работе без сети'
          : state.error
            ? 'Офлайн-кеш не подготовлен'
            : state.supported
              ? 'Подготовка офлайн-режима'
              : 'Офлайн-установка не поддерживается'}
      </Badge>
      <p className="help-text">
        После первой полной загрузки можно открывать трекер без сети. В
        офлайн-кеш попадают только файлы интерфейса. История и изображения
        остаются в локальном хранилище браузера.
      </p>
      {state.installAvailable ? (
        <Button variant="secondary" onClick={() => void installApp()}>
          <Download size={17} aria-hidden="true" />
          Установить приложение
        </Button>
      ) : (
        <p className="help-text">
          Для установки используйте меню браузера «Установить приложение» или
          «На экран Домой», если такой пункт доступен.
        </p>
      )}
      {state.supported && (
        <Button variant="ghost" onClick={() => void checkForUpdate()}>
          Проверить обновление
        </Button>
      )}
    </section>
  );
}
