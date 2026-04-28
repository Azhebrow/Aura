import selectedDateState from '../system/state/SelectedDateState.js';

/**
 * Метрика с семантическим цветом (ошибка/успех и т.д.) — при выбранной ячейке сохраняем inline-цвет.
 */
export function isSemanticMetricColor(color) {
  if (!color || typeof color !== 'string') return false;
  return /var\(--color-(error|success|warning|info)\b/.test(color);
}

/**
 * Синхронизирует color у блока метрики: выбран + не семантика → снять inline (работает CSS);
 * иначе оставить цвет из displayData.
 */
export function syncCalendarPercentTextColor(percentEl, displayData, date) {
  if (!percentEl || !displayData) return;
  if (percentEl.closest('.calendar-cell-future, .calendar-modal-cell-future')) {
    percentEl.style.color = 'var(--color-on-surface-secondary)';
    return;
  }
  const selected = selectedDateState.isSelected(date);
  const semantic = isSemanticMetricColor(displayData.color);
  if (selected && !semantic) {
    percentEl.style.removeProperty('color');
  } else {
    percentEl.style.color = displayData.color;
  }
}
