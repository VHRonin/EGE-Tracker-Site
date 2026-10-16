export function percentage(value: number | null) {
  return value === null ? '—' : `${Math.round(value * 100)} %`;
}
