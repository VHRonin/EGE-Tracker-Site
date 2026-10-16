// Presentation-only navigation. Stable database IDs and the exercise catalog belong to stage 2.
export const subjectNavigation = [
  {
    code: 'math',
    title: 'Математика',
    subtitle: 'Профильный уровень',
    symbol: 'x²',
    color: 'blue',
  },
  {
    code: 'russian',
    title: 'Русский язык',
    subtitle: 'От правила к практике',
    symbol: 'Аа',
    color: 'amber',
  },
  {
    code: 'informatics',
    title: 'Информатика',
    subtitle: 'Логика каждого решения',
    symbol: '</>',
    color: 'teal',
  },
] as const;
