/**
 * Централизованный экспорт всех сервисов
 */
export { default as databaseService } from './DatabaseService.js';
export { default as stateService } from './StateService.js';
export { default as settingsChangeTracker } from './SettingsChangeTracker.js';
export { default as taskCategoriesConfigService } from './TaskCategoriesConfigService.js';
export { default as navOrderConfigService } from './NavOrderConfigService.js';
export { default as pageSectionsVisibilityService } from './PageSectionsVisibilityService.js';
export { audioSystem } from '../audio/index.js';

// PointsService использует CommonJS (module.exports), поэтому не экспортируем его здесь
// Используйте require() напрямую: const PointsService = require('./system/services/PointsService.js');




