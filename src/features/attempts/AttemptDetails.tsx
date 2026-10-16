import type { AttemptWithImage } from './AttemptForm';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Dialog } from '../../shared/ui/Dialog';
import { BlobImage } from '../../shared/ui/BlobImage';
import { formatDate } from '../../shared/dates';

export function AttemptDetails({
  attempt,
  topic,
  onClose,
  onEdit,
}: {
  attempt: AttemptWithImage;
  topic: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <Dialog
      open
      title="Решение"
      onClose={onClose}
      description={formatDate(attempt.solvedAt)}
    >
      <div className="form-stack">
        <div className="row-actions">
          <Badge tone={attempt.isCorrect ? 'success' : 'danger'}>
            {attempt.isCorrect ? 'Правильно' : 'Неправильно'}
          </Badge>
          <span className="help-text break-anywhere">{topic}</span>
        </div>
        <dl className="attempt-details">
          {(
            [
              ['Условие или описание', attempt.description],
              ['Мой ответ', attempt.myAnswer],
              ['Правильный ответ', attempt.correctAnswer],
              ['Комментарий', attempt.comment],
            ] as const
          ).map(
            ([label, value]) =>
              value && (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ),
          )}
        </dl>
        {attempt.attachment && (
          <div>
            <BlobImage blob={attempt.attachment.blob} alt="Скриншот задания" />
            <p className="help-text break-anywhere">
              {attempt.attachment.filename}
            </p>
          </div>
        )}
        <div className="dialog__actions">
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          <Button onClick={onEdit}>Изменить решение</Button>
        </div>
      </div>
    </Dialog>
  );
}
