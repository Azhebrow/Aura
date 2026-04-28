/**
 * Централизованная звуковая система для AURA
 * Управляет воспроизведением звуков при взаимодействии с интерфейсом
 */

import { eventBusSounds, buttonSounds, defaultSettings, preloadSounds, getSoundForEvent, getSoundForButton, DEFAULT_VOLUME } from './soundConfig.js';
import { TYPED_SOUND_CONFIG } from './soundTypes.js';
import eventBus from '../core/EventBus.js';

class AudioSystem {
  constructor() {
    this.sounds = new Map(); // Кэш загруженных звуков
    // Уменьшаем базовую громкость в 2 раза для всех звуков
    this.volume = defaultSettings.volume / 2;
    this.enabled = defaultSettings.enabled;
    this.eventBusSubscriptions = new Map(); // Подписки на EventBus
    this.lastPlayTimes = new Map(); // Время последнего воспроизведения каждого звука (для защиты от дублей)
    this.DEBOUNCE_TIME = 100; // Минимальное время между воспроизведениями одного звука (мс)
    this.GLOBAL_DEBOUNCE_TIME = 50; // Минимальное время между любыми звуками (для защиты от наложений)
    this.lastGlobalPlayTime = 0; // Время последнего воспроизведения любого звука
    
    // Инициализация при создании
    if (defaultSettings.preload) {
      this.preload(preloadSounds);
    }
    
    // Автоматическая подписка на события EventBus
    this.setupEventBusListeners();
  }

  /**
   * Получение пути к звуковому файлу
   * @param {string} soundName - Имя звука (без расширения)
   * @returns {string} URL для загрузки звука
   */
  getSoundPath(soundName) {
    // В Electron используем абсолютные пути
    if (typeof window !== 'undefined' && window.require) {
      try {
        const pathModule = window.require('path');
        const urlModule = window.require('url');
        const fsModule = window.require('fs');
        
        // Все звуки теперь в одной папке sounds/ (поддерживаются WAV и MP3)
        const extensions = ['.wav', '.mp3'];
        const basePath = pathModule.join('src', 'system', 'audio', 'sounds');
        
        // Пробуем разные пути
        const possiblePaths = [];
        
        // Путь для production (resourcesPath)
        if (typeof process !== 'undefined' && process.resourcesPath) {
          for (const ext of extensions) {
            possiblePaths.push(
              pathModule.join(process.resourcesPath, 'app', basePath, `${soundName}${ext}`),
              pathModule.join(process.resourcesPath, 'app.asar', basePath, `${soundName}${ext}`)
            );
          }
        }
        
        // Путь через process.cwd (dev режим)
        if (typeof process !== 'undefined' && process.cwd) {
          for (const ext of extensions) {
            possiblePaths.push(
              pathModule.join(process.cwd(), basePath, `${soundName}${ext}`)
            );
          }
        }
        
        // Путь через __dirname (если доступен)
        if (typeof __dirname !== 'undefined') {
          for (const ext of extensions) {
            possiblePaths.push(
              pathModule.join(__dirname, 'sounds', `${soundName}${ext}`)
            );
          }
        }
        
        // Пробуем каждый путь
        for (const filePath of possiblePaths) {
          try {
            if (fsModule.existsSync(filePath)) {
              // Преобразуем в file:// URL
              const normalizedPath = pathModule.normalize(filePath);
              const fileUrl = urlModule.pathToFileURL(normalizedPath);
              return fileUrl.href;
            }
          } catch (e) {
            // Продолжаем пробовать другие пути
          }
        }
      } catch (error) {
        console.warn('[AudioSystem] Ошибка получения пути через Electron API:', error);
      }
    }
    
    // Fallback: относительный путь для dev режима в браузере
    // Пробуем сначала WAV, затем MP3 (поддерживаются оба формата)
    // Браузер сам попробует загрузить файл, если не найден - будет ошибка, но это нормально
    return `./src/system/audio/sounds/${soundName}.wav`;
  }

  /**
   * Воспроизведение звука по имени
   * @param {string} soundName - Имя звука (без расширения)
   * @param {Object} options - Опции { volume, force, skipDebounce }
   */
  play(soundName, options = {}) {
    if (!this.enabled && !options.force) {
      return;
    }

    if (!soundName) {
      console.warn('[AudioSystem] Имя звука не указано');
      return;
    }

    const now = Date.now();

    // ГЛОБАЛЬНАЯ ЗАЩИТА ОТ НАЛОЖЕНИЙ: Подавляем звуки, если недавно был воспроизведен любой звук
    // Это предотвращает наложение разных звуков друг на друга
    if (!options.skipDebounce && !options.force) {
      if ((now - this.lastGlobalPlayTime) < this.GLOBAL_DEBOUNCE_TIME) {
        // Слишком недавно воспроизводили какой-то звук, пропускаем
        return null;
      }
      this.lastGlobalPlayTime = now;
    }

    // Защита от двойного воспроизведения: проверяем, не был ли этот звук воспроизведен слишком недавно
    if (!options.skipDebounce) {
      const lastPlayTime = this.lastPlayTimes.get(soundName);
      
      if (lastPlayTime && (now - lastPlayTime) < this.DEBOUNCE_TIME) {
        // Слишком недавно воспроизводили этот звук, пропускаем
        return null;
      }
      
      // Обновляем время последнего воспроизведения
      this.lastPlayTimes.set(soundName, now);
    }

    try {
      let audio = this.sounds.get(soundName);
      
      // Если звук не загружен, загружаем его
      if (!audio) {
        audio = this.loadSound(soundName);
        if (!audio) {
          console.warn(`[AudioSystem] Звук "${soundName}" не найден`);
          return;
        }
        this.sounds.set(soundName, audio);
      }

      // Клонируем аудио для одновременного воспроизведения
      const audioClone = audio.cloneNode();
      const finalVolume = options.volume !== undefined ? options.volume : this.volume;
      audioClone.volume = finalVolume;
      
      // Если указан pitchShift, изменяем playbackRate для изменения высоты тона
      // pitchShift > 1.0 повышает тон (и ускоряет воспроизведение)
      // pitchShift < 1.0 понижает тон (и замедляет воспроизведение)
      if (options.pitchShift && typeof options.pitchShift === 'number') {
        audioClone.playbackRate = options.pitchShift;
      }
      
      // Воспроизводим с обработкой ошибок
      audioClone.play().catch(error => {
        // Игнорируем ошибки воспроизведения (например, если пользователь не взаимодействовал со страницей)
        // Это нормальное поведение браузеров для автовоспроизведения
        if (error.name !== 'NotAllowedError' && error.name !== 'NotSupportedError') {
          console.warn(`[AudioSystem] Ошибка воспроизведения "${soundName}":`, error);
        }
      });

      return audioClone;
    } catch (error) {
      // Graceful degradation - не ломаем приложение при ошибках аудио
      console.warn(`[AudioSystem] Ошибка при воспроизведении "${soundName}":`, error);
      return null;
    }
  }

  /**
   * Загрузка звука
   * @param {string} soundName - Имя звука (без расширения)
   * @returns {HTMLAudioElement|null}
   */
  loadSound(soundName) {
    try {
      const soundPath = this.getSoundPath(soundName);
      const audio = new Audio(soundPath);
      audio.preload = 'auto';
      
      // Обработка ошибок загрузки - graceful degradation
      audio.addEventListener('error', (e) => {
        const error = audio.error;
        let errorMessage = `[AudioSystem] Ошибка загрузки звука "${soundName}"`;
        
        if (error) {
          switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage += ': загрузка прервана';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage += ': ошибка сети';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage += ': ошибка декодирования';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage += ': формат не поддерживается или файл не найден';
              break;
            default:
              errorMessage += `: неизвестная ошибка (код ${error.code})`;
          }
        }
        
        console.warn(errorMessage, `Путь: ${soundPath}`);
        // Не выбрасываем ошибку, просто логируем предупреждение
      });
      
      return audio;
    } catch (error) {
      console.warn(`[AudioSystem] Ошибка создания аудио элемента для "${soundName}":`, error);
      // Возвращаем null вместо выброса ошибки для graceful degradation
      return null;
    }
  }

  /**
   * Предзагрузка звуков
   * @param {string[]} soundNames - Массив имен звуков
   */
  preload(soundNames) {
    if (!Array.isArray(soundNames)) {
      console.warn('[AudioSystem] preload ожидает массив имен звуков');
      return;
    }

    soundNames.forEach(soundName => {
      if (!this.sounds.has(soundName)) {
        const audio = this.loadSound(soundName);
        if (audio) {
          this.sounds.set(soundName, audio);
          // Пытаемся загрузить звук с обработкой ошибок
          try {
            audio.load();
          } catch (error) {
            // Игнорируем ошибки предзагрузки - звук загрузится при первом использовании
            console.warn(`[AudioSystem] Ошибка предзагрузки "${soundName}":`, error);
          }
        } else {
          // Звук не загружен, но не ломаем приложение
          console.warn(`[AudioSystem] Не удалось загрузить звук "${soundName}" для предзагрузки`);
        }
      }
    });
  }

  /**
   * Установка громкости
   * @param {number} volume - Громкость от 0 до 1
   */
  setVolume(volume) {
    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      console.warn('[AudioSystem] Громкость должна быть числом от 0 до 1');
      return;
    }
    this.volume = volume;
    // Обновляем громкость всех загруженных звуков
    this.sounds.forEach(audio => {
      audio.volume = volume;
    });
  }

  /**
   * Получение текущей громкости
   * @returns {number}
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Включение системы
   */
  enable() {
    this.enabled = true;
    console.log('[AudioSystem] Звуковая система включена');
  }

  /**
   * Выключение системы
   */
  disable() {
    this.enabled = false;
    console.log('[AudioSystem] Звуковая система выключена');
  }

  /**
   * Проверка, включена ли система
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Привязка звука к кнопке
   * @param {HTMLElement} element - Элемент кнопки
   * @param {string} soundName - Имя звука (опционально, если не указано - используется типизированная система)
   * @param {Object} options - Опции (volume - громкость от 0 до 1)
   */
  attachToButton(element, soundName = null, options = {}) {
    if (!element || !(element instanceof HTMLElement)) {
      console.warn('[AudioSystem] attachToButton ожидает HTMLElement');
      return;
    }

    // Проверяем, не добавлен ли уже обработчик звука для этого элемента
    if (element._audioSystemAttached) {
      // Звук уже привязан к этой кнопке, не добавляем повторно
      return;
    }

    // Определяем звук через типизированную систему
    const sound = soundName || getSoundForButton(element);
    
    // Громкость для кнопок по умолчанию в 2 раза меньше общей (если не указана явно)
    const defaultButtonVolume = DEFAULT_VOLUME / 2;
    const volume = options.volume !== undefined ? options.volume : defaultButtonVolume;

    // Добавляем обработчик клика
    const clickHandler = () => {
      this.play(sound, { volume });
    };

    element.addEventListener('click', clickHandler);
    
    // Сохраняем обработчик для возможного удаления
    if (!element._audioSystemHandlers) {
      element._audioSystemHandlers = [];
    }
    element._audioSystemHandlers.push({ type: 'click', handler: clickHandler });
    
    // Помечаем, что звук привязан к этому элементу
    element._audioSystemAttached = true;
  }

  /**
   * Привязка звука к событию EventBus
   * @param {string} eventName - Имя события EventBus
   * @param {string} soundName - Имя звука (опционально, если не указано - берется из типизированной системы)
   */
  attachToEventBus(eventName, soundName = null) {
    if (!eventName || typeof eventName !== 'string') {
      console.warn('[AudioSystem] attachToEventBus ожидает строку с именем события');
      return;
    }

    // Подписываемся на событие
    const unsubscribe = eventBus.on(eventName, (detail) => {
      // Используем типизированную систему для получения звука
      // Она автоматически обрабатывает условия (например, для taskProgressChanged)
      const sound = soundName || getSoundForEvent(eventName, detail);
      
      if (sound) {
        this.play(sound);
      }
    });

    // Сохраняем подписку для возможного удаления
    this.eventBusSubscriptions.set(eventName, unsubscribe);
  }

  /**
   * Автоматическая настройка подписок на события EventBus из конфигурации
   * Использует типизированную систему для всех событий, включая те, что с условиями
   */
  setupEventBusListeners() {
    // Подписываемся на все события из типизированной конфигурации
    // Это включает события с условиями, которые не попали в eventBusSounds
    Object.keys(TYPED_SOUND_CONFIG.eventBusToCategory).forEach(eventName => {
      this.attachToEventBus(eventName);
    });
  }

  /**
   * Удаление привязки звука к кнопке
   * @param {HTMLElement} element - Элемент кнопки
   */
  detachFromButton(element) {
    if (!element || !element._audioSystemHandlers) {
      return;
    }

    element._audioSystemHandlers.forEach(({ type, handler }) => {
      element.removeEventListener(type, handler);
    });

    delete element._audioSystemHandlers;
    delete element._audioSystemAttached;
  }

  /**
   * Удаление привязки звука к событию EventBus
   * @param {string} eventName - Имя события EventBus
   */
  detachFromEventBus(eventName) {
    const unsubscribe = this.eventBusSubscriptions.get(eventName);
    if (unsubscribe) {
      unsubscribe();
      this.eventBusSubscriptions.delete(eventName);
    }
  }

  /**
   * Очистка всех подписок и кэша
   */
  cleanup() {
    // Удаляем все подписки на EventBus
    this.eventBusSubscriptions.forEach(unsubscribe => unsubscribe());
    this.eventBusSubscriptions.clear();
    
    // Очищаем кэш звуков
    this.sounds.clear();
  }
}

// Создаем singleton экземпляр
const audioSystem = new AudioSystem();

export default audioSystem;
