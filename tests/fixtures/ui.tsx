import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '../../src/shared/ui/Button';
import {
  RadioGroup,
  SelectField,
  TextAreaField,
  TextField,
} from '../../src/shared/ui/FormControls';
import { Badge } from '../../src/shared/ui/Badge';
import '../../src/styles/index.css';

export function ComponentFixture() {
  const [result, setResult] = useState('correct');
  const [submitted, setSubmitted] = useState(false);
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-6 text-xl font-bold">Проверка компонентов</h1>
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <TextField
          label="Название"
          required
          hint="Обязательное поле для проверки"
        />
        <SelectField label="Предмет">
          <option>Математика</option>
          <option>Русский язык</option>
          <option>Информатика</option>
        </SelectField>
        <TextAreaField label="Комментарий" />
        <RadioGroup
          legend="Результат"
          name="result"
          options={[
            { value: 'correct', label: 'Правильно' },
            { value: 'incorrect', label: 'Неправильно' },
          ]}
          value={result}
          onChange={setResult}
        />
        <Button type="submit">Проверить ввод</Button>
        {submitted && (
          <p role="status">
            Форма отправлена:{' '}
            {result === 'correct' ? 'правильно' : 'неправильно'}
          </p>
        )}
      </form>
      <div className="mt-6 flex flex-wrap gap-3">
        <Badge>Не изучено</Badge>
        <Badge tone="blue">Нужна практика</Badge>
        <Badge tone="success">Отлично</Badge>
        <Badge tone="warning">Пора повторить</Badge>
        <Badge tone="danger">Слабая подготовка</Badge>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<ComponentFixture />);
