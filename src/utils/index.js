import ColorUtils from './colorUtils.js';
import iconLoader from './iconLoader.js';
import * as colorConversion from './colorConversion.js';
import * as formatCurrency from './formatCurrency.js';
import DayLockManager from '../system/utils/DayLockManager.js';
import { confirmWithSound } from './confirmDialog.js';
import { setupDragScroll } from './dragScroll.js';

// Экспортируем getCategoryColor из colorConversion для удобства
const { getCategoryColor } = colorConversion;

export {
  ColorUtils,
  iconLoader,
  colorConversion,
  formatCurrency,
  DayLockManager,
  getCategoryColor,
  confirmWithSound,
  setupDragScroll
};

export default {
  ColorUtils,
  iconLoader,
  colorConversion,
  formatCurrency,
  DayLockManager,
  getCategoryColor,
  confirmWithSound,
  setupDragScroll
};

