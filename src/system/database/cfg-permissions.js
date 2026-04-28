// Конфигурация разрешений для CFG элементов
// Определяет какие действия разрешены для каждого типа элементов

// Паттерны разрешений для переиспользования
export const DEFAULT_PERMISSIONS = {
  canAdd: true,
  canDelete: true,
  canEdit: true,
  canReorder: true
};

export const TASKS_PERMISSIONS = {
  canAdd: true,
  canDelete: true,
  canEdit: true,
  canReorder: true
};

export const MOODS_PERMISSIONS = {
  canAdd: false,
  canDelete: false,
  canEdit: true,
  canReorder: false,
  editableFields: ['title', 'color', 'icon']
};

// Fallback разрешения для конфигов, которые не имеют встроенных permissions
// Используется только если config.permissions не указаны
export const CFG_PERMISSIONS = {
  // Категории задач (мин 1, макс 3 — проверки в CfgList)
  'tasks-rituals': TASKS_PERMISSIONS,
  'tasks-time': TASKS_PERMISSIONS,
  'tasks-body': TASKS_PERMISSIONS,
  'tasks-deps': TASKS_PERMISSIONS,

  // Настроения - нельзя менять местами или удалять, только менять иконки
  'diary-moods': MOODS_PERMISSIONS
};

// Получить разрешения для конфига
// Сначала проверяет config.permissions, затем CFG_PERMISSIONS, затем дефолт
export function getPermissions(configKey, config = null) {
  // Если передан config и в нем есть permissions, используем их
  if (config && config.permissions) {
    return config.permissions;
  }
  
  // Fallback на CFG_PERMISSIONS
  if (CFG_PERMISSIONS[configKey]) {
    return CFG_PERMISSIONS[configKey];
  }
  
  // Дефолтные разрешения
  return DEFAULT_PERMISSIONS;
}

// Валидация конфигураций - проверяет согласованность между CFG_CONFIGS и разрешениями
// Принимает CFG_CONFIGS как параметр для избежания циклических зависимостей
export function validateConfigs(cfgConfigs) {
  if (!cfgConfigs) {
    console.warn('[CFG Permissions] validateConfigs вызвана без параметра cfgConfigs');
    return false;
  }
  
  const configKeys = Object.keys(cfgConfigs);
  const issues = [];
  
  for (const configKey of configKeys) {
    const config = cfgConfigs[configKey];
    
    // Проверяем, что если есть permissions, они корректны
    if (config.permissions) {
      const requiredFields = ['canAdd', 'canDelete', 'canEdit', 'canReorder'];
      for (const field of requiredFields) {
        if (typeof config.permissions[field] !== 'boolean') {
          issues.push(`[${configKey}] permissions.${field} должен быть boolean`);
        }
      }
      
      // Проверяем editableFields если указаны
      if (config.permissions.editableFields) {
        if (!Array.isArray(config.permissions.editableFields)) {
          issues.push(`[${configKey}] permissions.editableFields должен быть массивом`);
        } else {
          // Проверяем, что указанные поля существуют в config.fields
          const fieldNames = config.fields.map(f => f.name);
          for (const editableField of config.permissions.editableFields) {
            if (!fieldNames.includes(editableField)) {
              issues.push(`[${configKey}] permissions.editableFields содержит несуществующее поле: ${editableField}`);
            }
          }
        }
      }
    }
  }
  
  if (issues.length > 0) {
    console.warn('[CFG Permissions] Обнаружены проблемы в конфигурациях:', issues);
    return false;
  }
  
  return true;
}

