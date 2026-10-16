import {
  BookOpen,
  ChartNoAxesCombined,
  House,
  RotateCcw,
  Settings2,
} from 'lucide-react';

export const navigation = [
  { to: '/', label: 'Главная', icon: House },
  { to: '/subjects', label: 'Предметы', icon: BookOpen },
  { to: '/review', label: 'Повторить', icon: RotateCcw },
  { to: '/statistics', label: 'Статистика', icon: ChartNoAxesCombined },
  { to: '/settings', label: 'Настройки', icon: Settings2 },
] as const;
