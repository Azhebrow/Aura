import type { StatsGroupBy, StatsMode } from './types';
import { TASK_CATEGORY_DEFAULT_META } from '@/shared/config/domain-taxonomy';

/**
 * Порядок столбцов (как `getColumnOrder` в legacy `StatsDataFormatter.js`).
 */
export function getColumnOrder(mode: StatsMode, groupBy: StatsGroupBy, allKeys: Set<string>): string[] {
  const keysArray = Array.from(allKeys);

  if (mode === 'tasks' && groupBy === 'categories') {
    const order = [
      TASK_CATEGORY_DEFAULT_META.rituals.title,
      TASK_CATEGORY_DEFAULT_META.time.title,
      TASK_CATEGORY_DEFAULT_META.body.title,
      TASK_CATEGORY_DEFAULT_META.deps.title,
    ];
    return order.filter((k) => allKeys.has(k)).concat(keysArray.filter((k) => !order.includes(k)));
  }
  if (mode === 'tasks' && groupBy === 'elements') {
    return keysArray;
  }

  if (mode === 'finance' && groupBy === 'categories') {
    const order = ['Доходы', 'Расходы'];
    return order.filter((k) => allKeys.has(k)).concat(keysArray.filter((k) => !order.includes(k)));
  }
  if (mode === 'finance' && groupBy === 'elements') {
    const income = keysArray.filter((k) => k.startsWith('+ ')).sort((a, b) => a.localeCompare(b));
    const expense = keysArray.filter((k) => k.startsWith('- ')).sort((a, b) => a.localeCompare(b));
    const other = keysArray.filter((k) => !k.startsWith('+ ') && !k.startsWith('- ')).sort();
    return income.concat(expense).concat(other);
  }

  if ((mode === 'time' || mode === 'leisure') && groupBy === 'categories') {
    const order = mode === 'leisure' ? ['Наполнение', 'Эскапизм'] : ['Фокус', 'Наполнение', 'Эскапизм'];
    return order.filter((k) => allKeys.has(k)).concat(keysArray.filter((k) => !order.includes(k)));
  }
  if ((mode === 'time' || mode === 'leisure') && groupBy === 'elements') {
    return keysArray;
  }

  if (mode === 'rituals' && groupBy === 'categories') {
    const order = ['Утро', 'Вечер'];
    return order.filter((k) => allKeys.has(k)).concat(keysArray.filter((k) => !order.includes(k)));
  }
  if (mode === 'rituals' && groupBy === 'elements') {
    return keysArray;
  }

  if (mode === 'nutrition' && groupBy === 'categories') {
    const order = ['Белки', 'Жиры', 'Углеводы', 'Калории'];
    return order.filter((k) => allKeys.has(k)).concat(keysArray.filter((k) => !order.includes(k)).sort());
  }
  if (mode === 'nutrition' && groupBy === 'elements') {
    return keysArray.sort();
  }

  if (mode === 'correlation') {
    const order = [
      'Успех, %',
      'Фокус, ч',
      'Калории, ккал',
      'Ритуалы, %',
      'Настроение',
      'Эскапизм, ч',
      'Наполнение, ч',
    ];
    return order.filter((k) => allKeys.has(k)).concat(keysArray.filter((k) => !order.includes(k)).sort());
  }

  return keysArray.sort();
}
