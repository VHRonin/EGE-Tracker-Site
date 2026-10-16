import { Check, X } from 'lucide-react';
import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

type FieldProps = { label: string; hint?: string; error?: string };

function Field({
  id,
  label,
  hint,
  error,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(
  id: string,
  hint?: string,
  error?: string,
  extra?: string,
) {
  return (
    [hint && `${id}-hint`, error && `${id}-error`, extra]
      .filter(Boolean)
      .join(' ') || undefined
  );
}

export function TextField({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <input
        {...props}
        id={fieldId}
        className={`input ${className}`}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy(
          fieldId,
          hint,
          error,
          props['aria-describedby'],
        )}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <textarea
        rows={4}
        {...props}
        id={fieldId}
        className={`input ${className}`}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy(
          fieldId,
          hint,
          error,
          props['aria-describedby'],
        )}
      />
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <Field id={fieldId} label={label} hint={hint} error={error}>
      <select
        {...props}
        id={fieldId}
        className={`input ${className}`}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy(
          fieldId,
          hint,
          error,
          props['aria-describedby'],
        )}
      />
    </Field>
  );
}

export function RadioGroup({
  legend,
  name,
  options,
  value,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const errorId = useId();
  return (
    <fieldset
      className="radio-group"
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
    >
      <legend>{legend}</legend>
      <div className="radio-options">
        {options.map((option) => (
          <label className="radio-option" key={option.value}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
            {(option.value === 'correct' || option.value === 'incorrect') && (
              <span className="radio-option__mark" aria-hidden="true">
                {option.value === 'correct' ? (
                  <Check size={23} />
                ) : (
                  <X size={23} />
                )}
              </span>
            )}
          </label>
        ))}
      </div>
      {error && (
        <p className="field__error" id={errorId} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
