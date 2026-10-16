import { useEffect, useRef, useState } from 'react';
import { Download, FileJson, Upload, Trash2 } from 'lucide-react';
import { backups } from '../../application/backups';
import type { BackupPreview } from '../../application/backupService';
import { useMutation } from '../../application/useMutation';
import { Button } from '../../shared/ui/Button';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { formatDate } from '../../shared/dates';

function fileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toLocaleString('ru', { maximumFractionDigits: 2 })} МиБ`;
}

export function BackupControls() {
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [confirm, setConfirm] = useState<'import' | 'reset' | null>(null);
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const mutation = useMutation();
  useEffect(() => () => backups.cancel(), []);

  function cancelPreview() {
    backups.cancel();
    setPreview(null);
    if (input.current) input.current.value = '';
  }
  async function download() {
    await mutation.run(
      async () => {
        const contents = await backups.export();
        const url = URL.createObjectURL(
          new Blob([contents], { type: 'application/json' }),
        );
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `ege-tracker-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      },
      () =>
        setNotice(
          'Резервная копия подготовлена. Сохраните скачанный JSON-файл.',
        ),
    );
  }

  return (
    <section className="card backup-controls" aria-labelledby="backup-title">
      <div className="section-heading">
        <h2 id="backup-title">Резервные копии</h2>
        <FileJson size={22} aria-hidden="true" />
      </div>
      <div className="backup-section backup-section--export">
        <h3>Экспорт JSON</h3>
        <p className="help-text">
          Экспорт включает все предметы, номера, подтемы, историю и скриншоты.
          Изображения могут сделать файл большим. Данные переносятся вручную
          через JSON.
        </p>
        <div className="row-actions backup-actions">
          <Button disabled={mutation.busy} onClick={() => void download()}>
            <Download size={17} aria-hidden="true" />
            Экспортировать JSON
          </Button>
        </div>
      </div>
      <div className="backup-section backup-section--import">
        <h3>Импорт JSON</h3>
        <div className="field">
          <label htmlFor="backup-file">Импортировать резервную копию</label>
          <input
            id="backup-file"
            ref={input}
            type="file"
            accept=".json,application/json"
            disabled={mutation.busy}
            aria-describedby="backup-help"
            onChange={(event) => {
              const file = event.target.files?.[0];
              cancelPreview();
              setNotice('');
              if (file)
                void mutation.run(() => backups.previewFile(file), setPreview);
            }}
          />
          <p id="backup-help" className="field__hint">
            Сначала проверим файл и покажем его состав. Импорт полностью
            заменяет данные этого браузера. Файл до 256 МиБ, изображения
            суммарно до 128 МиБ.
          </p>
        </div>
      </div>
      {mutation.busy && (
        <p role="status" className="help-text">
          Подготавливаем данные…
        </p>
      )}
      {mutation.error && (
        <p className="feedback feedback--error" role="alert">
          {mutation.error}
        </p>
      )}
      {notice && (
        <p className="feedback feedback--success" role="status">
          {notice}
        </p>
      )}
      {preview && (
        <div className="backup-preview">
          <h3>Копия проверена</h3>
          <p className="help-text">
            Создана {formatDate(preview.exportedAt)} · файл{' '}
            {fileSize(preview.fileBytes)} · изображения{' '}
            {fileSize(preview.imageBytes)}
          </p>
          <dl className="backup-counts">
            <div>
              <dt>Предметов</dt>
              <dd>{preview.subjects}</dd>
            </div>
            <div>
              <dt>Номеров</dt>
              <dd>{preview.exercises}</dd>
            </div>
            <div>
              <dt>Подтем</dt>
              <dd>{preview.subtopics}</dd>
            </div>
            <div>
              <dt>Решений</dt>
              <dd>{preview.attempts}</dd>
            </div>
            <div>
              <dt>Скриншотов</dt>
              <dd>{preview.attachments}</dd>
            </div>
          </dl>
          <p className="help-text">
            Перед заменой рекомендуем экспортировать текущие данные. Объединение
            с существующей историей не выполняется.
          </p>
          <div className="row-actions">
            <Button
              variant="secondary"
              disabled={mutation.busy}
              onClick={cancelPreview}
            >
              Отменить импорт
            </Button>
            <Button
              disabled={mutation.busy}
              onClick={() => setConfirm('import')}
            >
              <Upload size={17} aria-hidden="true" />
              Продолжить импорт
            </Button>
          </div>
        </div>
      )}
      <div className="reset-area">
        <h3>Сброс данных</h3>
        <p className="help-text">
          Удаляет всю историю, подтемы и скриншоты; возвращает стартовый
          каталог. Сначала сохраните резервную копию.
        </p>
        <Button
          variant="danger"
          disabled={mutation.busy}
          onClick={() => setConfirm('reset')}
        >
          <Trash2 size={17} aria-hidden="true" />
          Сбросить данные
        </Button>
      </div>
      {confirm === 'import' && preview && (
        <ConfirmDialog
          title="Полностью заменить данные?"
          description={`Будут загружены ${preview.attempts} решений и ${preview.attachments} скриншотов. Текущие предметы, номера, подтемы и история будут заменены. Сначала экспортируйте текущие данные, если хотите их сохранить.`}
          confirmLabel="Заменить данные"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await backups.restore(preview.token);
            setPreview(null);
            if (input.current) input.current.value = '';
            setNotice('Резервная копия восстановлена целиком.');
          }}
        />
      )}
      {confirm === 'reset' && (
        <ConfirmDialog
          title="Сбросить все данные?"
          description="Все решения, подтемы и скриншоты этого браузера будут удалены. Останутся три предмета со стартовыми номерами. Для восстановления понадобится заранее сохранённая резервная копия."
          confirmLabel="Да, сбросить всё"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await backups.reset();
            setPreview(null);
            if (input.current) input.current.value = '';
            setNotice('Данные сброшены. Стартовый каталог восстановлен.');
          }}
        />
      )}
    </section>
  );
}
