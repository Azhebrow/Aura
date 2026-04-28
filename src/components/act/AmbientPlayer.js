/**
 * Плеер для воспроизведения ambient музыки
 * Использует HTML5 Audio API для воспроизведения MP3 файлов
 */

import { DEFAULT_VOLUME } from '../../system/audio/soundConfig.js';

class AmbientPlayer {
  /**
   * @param {Object} ambient - Объект ambient из БД (с полями id, name, file_name и т.д.)
   */
  constructor(ambient) {
    this.ambient = ambient;
    this.audio = null;
    this.audio2 = null; // Второй аудио элемент для плавного зацикливания
    this.currentAudio = null; // Текущий активный аудио элемент
    this.nextAudio = null; // Следующий аудио элемент для crossfade
    this.volume = DEFAULT_VOLUME; // Громкость по умолчанию (использует общую константу)
    this.isInitialized = false;
    this.crossfadeDuration = 2; // Длительность crossfade в секундах
    this.crossfadeTimeout = null;
  }

  /**
   * Инициализирует аудио элемент
   */
  async init() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Используем динамический импорт для ES модуля
      const AmbientManagerModule = await import('../../utils/AmbientManager.js');
      const AmbientManager = AmbientManagerModule.default || AmbientManagerModule;
      const filePath = AmbientManager.getFilePath(this.ambient.file_name);
      
      if (!filePath) {
        throw new Error(`Файл ${this.ambient.file_name} не найден`);
      }

      // Преобразуем путь в правильный формат для Electron
      // В Electron нужно использовать правильное кодирование пути
      let audioSrc;
      if (typeof window !== 'undefined' && window.require) {
        // Используем pathToFileURL для правильного преобразования пути
        const pathModule = window.require('path');
        const urlModule = window.require('url');
        const fsModule = window.require('fs');
        
        // Проверяем существование файла
        if (!fsModule.existsSync(filePath)) {
          throw new Error(`Файл не найден: ${filePath}`);
        }
        
        // Нормализуем путь (убираем лишние разделители)
        const normalizedPath = pathModule.normalize(filePath);
        
        // Преобразуем в file:// URL с правильным кодированием
        // Используем pathToFileURL который правильно обрабатывает все символы
        const fileUrl = urlModule.pathToFileURL(normalizedPath);
        audioSrc = fileUrl.href;
        
        // pathToFileURL создает правильный формат file:///C:/path для Windows
        // Тройной слеш после file: это нормально для абсолютных путей Windows
        console.log('[AmbientPlayer] Исходный путь:', normalizedPath);
        console.log('[AmbientPlayer] Сгенерированный URL:', audioSrc);
        
        // Проверяем что файл действительно существует и читаем
        try {
          const stats = fsModule.statSync(filePath);
          console.log('[AmbientPlayer] Файл существует, размер:', stats.size, 'байт');
          if (stats.size === 0) {
            throw new Error('Файл пустой');
          }
        } catch (statError) {
          throw new Error(`Не удалось прочитать файл: ${statError.message}`);
        }
      } else {
        // Fallback: простое преобразование (может не работать с пробелами)
        audioSrc = `file://${filePath.replace(/\\/g, '/')}`;
        // Экранируем пробелы и специальные символы
        audioSrc = audioSrc.replace(/ /g, '%20');
      }
      
      console.log('[AmbientPlayer] Загрузка аудио из:', audioSrc);

      // Создаем два аудио элемента для плавного зацикливания (crossfade)
      this.audio = new Audio();
      this.audio.src = audioSrc;
      this.audio.loop = false; // Отключаем стандартный loop, будем делать crossfade
      this.audio.volume = this.volume;
      
      this.audio2 = new Audio();
      this.audio2.src = audioSrc;
      this.audio2.loop = false;
      this.audio2.volume = 0; // Начинаем с нулевой громкости
      
      this.currentAudio = this.audio;
      this.nextAudio = this.audio2;
      
      // Обработчики событий
      this.audio.addEventListener('error', (e) => {
        console.error('[AmbientPlayer] Ошибка загрузки аудио:', e);
        console.error('[AmbientPlayer] Путь к файлу:', filePath);
        console.error('[AmbientPlayer] URL:', audioSrc);
        if (this.audio && this.audio.error) {
          console.error('[AmbientPlayer] Детали ошибки:', {
            code: this.audio.error.code,
            message: this.audio.error.message
          });
        }
      });

      this.audio.addEventListener('loadeddata', () => {
        console.log('[AmbientPlayer] Аудио файл загружен:', this.ambient.name);
      });
      
      this.audio2.addEventListener('loadeddata', () => {
        console.log('[AmbientPlayer] Второй аудио файл загружен для crossfade');
      });
      
      // Обработчик для плавного зацикливания
      // Используем событие 'ended' для более точного определения конца трека
      this.audio.addEventListener('timeupdate', () => {
        this.handleLoop();
      });
      
      this.audio2.addEventListener('timeupdate', () => {
        this.handleLoop();
      });
      
      // Резервный обработчик на случай, если timeupdate не сработает
      this.audio.addEventListener('ended', () => {
        if (this.currentAudio === this.audio && !this.crossfadeTimeout) {
          this.startNextLoop();
        }
      });
      
      this.audio2.addEventListener('ended', () => {
        if (this.currentAudio === this.audio2 && !this.crossfadeTimeout) {
          this.startNextLoop();
        }
      });

      // Ждем загрузки метаданных обоих аудио элементов
      // Используем более мягкую обработку ошибок
      const loadAudio = (audioElement, name) => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Таймаут загрузки ${name} аудио файла`));
          }, 15000); // Увеличиваем таймаут до 15 секунд

          const onLoaded = () => {
            clearTimeout(timeout);
            audioElement.removeEventListener('error', onError);
            resolve();
          };

          const onError = (e) => {
            clearTimeout(timeout);
            audioElement.removeEventListener('loadedmetadata', onLoaded);
            const errorCode = audioElement.error?.code;
            const errorMsg = audioElement.error?.message || 'Неизвестная ошибка';
            
            // Коды ошибок MediaError:
            // 1 = MEDIA_ERR_ABORTED
            // 2 = MEDIA_ERR_NETWORK
            // 3 = MEDIA_ERR_DECODE
            // 4 = MEDIA_ERR_SRC_NOT_SUPPORTED
            console.error(`[AmbientPlayer] Ошибка загрузки ${name}: код ${errorCode}, сообщение: ${errorMsg}`);
            reject(new Error(`Ошибка загрузки ${name}: ${errorMsg} (код: ${errorCode})`));
          };

          audioElement.addEventListener('loadedmetadata', onLoaded, { once: true });
          audioElement.addEventListener('error', onError, { once: true });
          
          // Загружаем файл
          audioElement.load();
        });
      };

      try {
        await Promise.all([
          loadAudio(this.audio, 'первого'),
          loadAudio(this.audio2, 'второго')
        ]);
      } catch (e) {
        // Если один из файлов не загрузился, пробуем загрузить хотя бы один
        console.warn('[AmbientPlayer] Ошибка загрузки одного из аудио элементов, пробуем продолжить:', e);
        // Не бросаем ошибку, позволяем продолжить работу с одним элементом
      }

      this.isInitialized = true;
    } catch (e) {
      console.error('[AmbientPlayer] Ошибка инициализации:', e);
      throw e;
    }
  }

  /**
   * Обработчик для плавного зацикливания
   */
  handleLoop() {
    if (!this.currentAudio || !this.nextAudio) return;
    if (this.crossfadeTimeout) return; // Crossfade уже идет
    
    const duration = this.currentAudio.duration;
    const currentTime = this.currentAudio.currentTime;
    
    // Если осталось меньше crossfadeDuration секунд до конца
    if (duration && currentTime > 0 && (duration - currentTime) <= this.crossfadeDuration) {
      this.startNextLoop();
    }
  }

  /**
   * Начинает следующий цикл с crossfade
   */
  startNextLoop() {
    if (this.crossfadeTimeout) return; // Уже начали crossfade
    
    // Запускаем следующий аудио элемент с нулевой громкостью
    this.nextAudio.currentTime = 0;
    this.nextAudio.play().catch(e => {
      console.error('[AmbientPlayer] Ошибка запуска следующего аудио:', e);
    });
    
    // Плавно переключаем громкость
    this.startCrossfade();
  }

  /**
   * Начинает плавный переход (crossfade) между двумя аудио элементами
   */
  startCrossfade() {
    if (this.crossfadeTimeout) {
      clearInterval(this.crossfadeTimeout);
    }
    
    const steps = 20; // Количество шагов для плавного перехода
    const stepDuration = (this.crossfadeDuration * 1000) / steps;
    let step = 0;
    
    this.crossfadeTimeout = setInterval(() => {
      step++;
      const progress = step / steps;
      
      // Уменьшаем громкость текущего аудио
      if (this.currentAudio) {
        this.currentAudio.volume = this.volume * (1 - progress);
      }
      
      // Увеличиваем громкость следующего аудио
      if (this.nextAudio) {
        this.nextAudio.volume = this.volume * progress;
      }
      
      if (step >= steps) {
        clearInterval(this.crossfadeTimeout);
        this.crossfadeTimeout = null;
        
        // Переключаем роли: следующий становится текущим
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
          this.currentAudio.volume = 0;
        }
        
        // Меняем местами
        const temp = this.currentAudio;
        this.currentAudio = this.nextAudio;
        this.nextAudio = temp;
        
        // Устанавливаем правильную громкость
        if (this.currentAudio) {
          this.currentAudio.volume = this.volume;
        }
      }
    }, stepDuration);
  }

  /**
   * Начинает воспроизведение
   */
  async play() {
    if (!this.isInitialized) {
      await this.init();
    }

    if (!this.audio || !this.audio2) {
      throw new Error('Аудио элементы не инициализированы');
    }

    try {
      // Запускаем текущий аудио элемент
      await this.currentAudio.play();
      console.log('[AmbientPlayer] Воспроизведение начато:', this.ambient.name);
    } catch (e) {
      console.error('[AmbientPlayer] Ошибка воспроизведения:', e);
      throw e;
    }
  }

  /**
   * Ставит на паузу
   */
  pause() {
    if (this.crossfadeTimeout) {
      clearInterval(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }
    
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
    if (this.nextAudio && !this.nextAudio.paused) {
      this.nextAudio.pause();
    }
    console.log('[AmbientPlayer] Воспроизведение приостановлено:', this.ambient.name);
  }

  /**
   * Останавливает и сбрасывает воспроизведение
   */
  stop() {
    if (this.crossfadeTimeout) {
      clearInterval(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
    }
    if (this.nextAudio) {
      this.nextAudio.pause();
      this.nextAudio.currentTime = 0;
    }
    console.log('[AmbientPlayer] Воспроизведение остановлено:', this.ambient.name);
  }

  /**
   * Устанавливает громкость
   * @param {number} volume - Громкость от 0 до 1
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume)); // Ограничиваем от 0 до 1
    // Устанавливаем громкость для обоих аудио элементов с учетом текущего crossfade
    if (this.currentAudio && this.nextAudio) {
      // Если идет crossfade, не меняем громкость напрямую
      // Иначе устанавливаем для текущего активного
      if (!this.crossfadeTimeout) {
        this.currentAudio.volume = this.volume;
      }
    } else if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Возвращает текущую громкость
   * @returns {number} Громкость от 0 до 1
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Проверяет, воспроизводится ли музыка
   * @returns {boolean} true если воспроизводится
   */
  isPlaying() {
    return this.currentAudio && !this.currentAudio.paused && this.currentAudio.currentTime > 0;
  }

  /**
   * Уничтожает плеер и освобождает ресурсы
   */
  destroy() {
    if (this.crossfadeTimeout) {
      clearInterval(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }
    // Явно останавливаем оба элемента перед очисткой (гарантированная остановка)
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.src = '';
    }
    if (this.nextAudio) {
      this.nextAudio.pause();
      this.nextAudio.currentTime = 0;
      this.nextAudio.src = '';
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
      this.audio = null;
    }
    if (this.audio2) {
      this.audio2.pause();
      this.audio2.src = '';
      this.audio2 = null;
    }
    this.currentAudio = null;
    this.nextAudio = null;
    this.isInitialized = false;
  }
}

export default AmbientPlayer;
