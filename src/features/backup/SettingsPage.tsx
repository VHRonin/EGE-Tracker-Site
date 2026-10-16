import { lazy, Suspense, useState } from 'react';
import { HardDrive, Info } from 'lucide-react';
import { Card } from '../../shared/ui/Card';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Dialog } from '../../shared/ui/Dialog';
import { PageHeading } from '../../shared/ui/PageHeading';
import { QueryFeedback } from '../../shared/ui/QueryFeedback';
import { PwaSettings } from '../../pwa/PwaStatus';
const BackupControls = lazy(() =>
  import('./BackupControls').then((module) => ({
    default: module.BackupControls,
  })),
);

export function SettingsPage() {
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="ТВОЁ ЛИЧНОЕ ПРОСТРАНСТВО"
        title="Настройки и данные"
        visual={
          <span className="poster-heading-stamp">
            <HardDrive size={88} strokeWidth={1.2} />
          </span>
        }
        description="Локальное хранение, перенос истории и управление данными."
      />
      <div className="settings-grid">
        <Card className="settings-card">
          <HardDrive size={23} className="text-brand" aria-hidden="true" />
          <h2>Хранение в браузере</h2>
          <p>
            История решений и скриншоты хранятся в этом браузере. На разных
            устройствах данные независимы. Не очищай данные сайта, если хочешь
            сохранить историю.
          </p>
          <Badge tone="success">Работает</Badge>
        </Card>
        <PwaSettings />
      </div>
      <Suspense fallback={<QueryFeedback />}>
        <BackupControls />
      </Suspense>
      <Card className="about-card">
        <div>
          <h2>Инструмент для твоей подготовки</h2>
          <p>
            Три предмета, последовательная практика и внимание к результатам.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setAboutOpen(true)}>
          <Info size={17} aria-hidden="true" />О приложении
        </Button>
      </Card>
      <Dialog
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        title="О ЕГЭ Трекере"
        description="Личный инструмент учёта подготовки к ЕГЭ."
      >
        <div className="dialog__body">
          <p>
            Решай задачи в своих источниках, а в трекере сохраняй результаты по
            профильной математике, русскому языку и информатике.
          </p>
          <p>
            Записывай решения и скриншоты, следи за освоением и повторением,
            переноси полную историю через JSON. Оценка освоения — эвристика, а
            не прогноз результата экзамена.
          </p>
        </div>
        <div className="dialog__actions">
          <Button onClick={() => setAboutOpen(false)}>Понятно</Button>
        </div>
      </Dialog>
    </>
  );
}
