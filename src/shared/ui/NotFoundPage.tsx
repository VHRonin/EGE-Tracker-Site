import { Compass } from 'lucide-react';
import { ButtonLink } from './Button';
import { Card } from './Card';
import { EmptyState } from './EmptyState';
import { PageHeading } from './PageHeading';

export function NotFoundPage() {
  return (
    <>
      <PageHeading
        eyebrow="404"
        title="Страница не найдена"
        description="Похоже, в адресе опечатка или такой страницы пока нет."
      />
      <Card>
        <EmptyState
          icon={Compass}
          title="Вернёмся к подготовке"
          description="На главной странице можно выбрать нужный раздел."
          action={<ButtonLink to="/">На главную</ButtonLink>}
        />
      </Card>
    </>
  );
}
