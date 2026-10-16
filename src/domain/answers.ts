// Only short, single-token answers are eligible. Never infer mathematical equivalence.
export function suggestAnswer(
  myAnswer: string,
  correctAnswer: string,
): boolean | null {
  const my = myAnswer.normalize('NFC').trim();
  const expected = correctAnswer.normalize('NFC').trim();
  const unambiguous = (value: string) =>
    value.length > 0 &&
    value.length <= 100 &&
    (/^[+-]?\d+(?:[.,]\d+)?$/u.test(value) || /^[\p{L}\p{N}]+$/u.test(value));
  if (!unambiguous(my) || !unambiguous(expected)) return null;
  return my === expected;
}
