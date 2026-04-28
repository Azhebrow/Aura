class IconLoader {
  constructor() {
    this.iconsCache = new Map();
    this.loadingPromises = new Map(); // Для предотвращения дублирования запросов
  }

  /**
   * Загружает иконку из библиотеки @icons
   * @param {string} name - имя иконки (без расширения)
   * @returns {Promise<string>} - SVG содержимое (только внутренние элементы, без тегов <svg>)
   */
  async loadIcon(name) {
    // Если иконка уже загружена, возвращаем из кэша
    if (this.iconsCache.has(name)) {
      return this.iconsCache.get(name);
    }

    // Если иконка уже загружается, ждем существующий промис
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    // Создаем промис загрузки
    const loadPromise = this._loadIconInternal(name);
    this.loadingPromises.set(name, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(name);
    }
  }

  // Алиасы: устаревшие имена -> фактические имена файлов
  static ICON_ALIASES = {
    'x-circle': 'circle-x',
    'alert-circle': 'circle-alert'
  };

  async _loadIconInternal(name) {
    try {
      const actualName = IconLoader.ICON_ALIASES[name] || name;
      let svgContent = null;

      // Стратегия 1: Загрузка через fetch (работает в dev и production)
      // В Electron с loadFile() относительные пути работают относительно index.html
      // Пробуем разные варианты путей
      try {
        const pathsToTry = [
          `public/icons/${actualName}.svg`,
          `icons/${actualName}.svg`,
        ];
        
        // Если это Electron (file:// протокол), пробуем относительные пути
        const isElectron = window.location.protocol === 'file:';
        
        for (const path of pathsToTry) {
          try {
            const response = await fetch(path, { cache: 'no-cache' });
            if (response.ok) {
              svgContent = await response.text();
              break;
            }
          } catch (e) {
            // Пробуем следующий путь (ошибки в консоли нормальны для file:// протокола)
            // Они не критичны, так как вторая попытка обычно успешна
          }
        }
      } catch (fetchError) {
        // Игнорируем ошибки fetch, пробуем другие способы
      }

      // Стратегия 2: Загрузка через fs (для Electron в production)
      if (!svgContent && typeof window !== 'undefined' && window.require) {
        try {
          const fs = window.require('fs');
          const path = window.require('path');
          
          // Пробуем разные пути для Electron
          const possiblePaths = [];
          
          // Путь для production через __dirname (передан из main процесса)
          if (typeof window !== 'undefined' && window.__auraAppPath) {
            possiblePaths.push(
              path.join(window.__auraAppPath, 'public', 'icons', `${actualName}.svg`)
            );
          }
          
          if (typeof process !== 'undefined' && process.resourcesPath) {
            possiblePaths.push(
              path.join(process.resourcesPath, 'app', 'public', 'icons', `${actualName}.svg`),
              path.join(process.resourcesPath, 'app.asar', 'public', 'icons', `${actualName}.svg`)
            );
          }
          
          if (typeof process !== 'undefined' && process.cwd) {
            possiblePaths.push(
              path.join(process.cwd(), 'public', 'icons', `${actualName}.svg`)
            );
          }

          // Пробуем каждый путь
          for (const iconPath of possiblePaths) {
            try {
              if (fs.existsSync(iconPath)) {
                svgContent = fs.readFileSync(iconPath, 'utf8');
                break;
              }
            } catch (e) {
              // Продолжаем пробовать другие пути
            }
          }
        } catch (fsError) {
          // Игнорируем ошибки fs
        }
      }

      // Если ничего не сработало, возвращаем fallback
      if (!svgContent) {
        console.warn(`[IconLoader] Не удалось загрузить иконку "${name}", используем fallback`);
        const fallback = this._getFallbackIcon();
        this.iconsCache.set(name, fallback);
        return fallback;
      }

      // Извлекаем содержимое SVG (без тегов <svg>)
      const match = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
      
      if (!match || !match[1]) {
        console.warn(`[IconLoader] Неверный формат SVG для иконки "${name}"`);
        const fallback = this._getFallbackIcon();
        this.iconsCache.set(name, fallback);
        return fallback;
      }

      const innerHTML = match[1].trim();
      this.iconsCache.set(name, innerHTML);
      return innerHTML;
    } catch (error) {
      console.error(`[IconLoader] Ошибка загрузки иконки "${name}":`, error);
      const fallback = this._getFallbackIcon();
      this.iconsCache.set(name, fallback);
      return fallback;
    }
  }

  /**
   * Загружает несколько иконок параллельно
   * @param {string[]} names - массив имен иконок
   * @returns {Promise<Object>} - объект с иконками { name: svgContent }
   */
  async loadIcons(names) {
    const promises = names.map(name => 
      this.loadIcon(name).then(content => ({ name, content }))
    );
    const results = await Promise.all(promises);
    return results.reduce((acc, { name, content }) => {
      acc[name] = content;
      return acc;
    }, {});
  }

  /**
   * Предзагружает иконки (полезно для критичных иконок)
   * @param {string[]} names - массив имен иконок
   */
  async preloadIcons(names) {
    await this.loadIcons(names);
  }

  /**
   * Очищает кэш иконок
   */
  clearCache() {
    this.iconsCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Возвращает fallback иконку
   */
  _getFallbackIcon() {
    // Простой круг как fallback
    return `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>`;
  }
}

// Singleton для глобального использования
const iconLoader = new IconLoader();

export default iconLoader;
export { IconLoader };
