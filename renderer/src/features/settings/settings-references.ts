import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Apple,
  Ban,
  BookHeart,
  BookText,
  Ghost,
  Flame,
  ListTodo,
  Moon,
  Music,
  PiggyBank,
  Settings2,
  Smile,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';

export type SettingsFieldDef = {
  name: string;
  type: 'text' | 'number' | 'select' | 'color' | 'checkbox' | 'textarea' | 'json';
  required: boolean;
  description: string;
};

export type SettingsReferenceUsage = {
  page: string;
  section: string;
  sectionId?: string;
  isNavLink?: boolean;
};

export type SettingsReferenceRelated = {
  sectionId: string;
  reason: string;
};

export type SettingsReferenceAdditionalFunction = {
  name: string;
  description: string;
  example: string;
};

export type SettingsReferenceImpact = {
  title: string;
  description: string;
};

export type SettingsReference = {
  id: string;
  icon: LucideIcon;
  title: string;
  definition: string;
  usedOn: SettingsReferenceUsage[];
  fields: SettingsFieldDef[];
  relatedSettings: SettingsReferenceRelated[];
  additionalFunctions: SettingsReferenceAdditionalFunction[];
  impacts?: SettingsReferenceImpact[];
};

export const SETTINGS_REFERENCES: Record<string, SettingsReference> = {
  'interface-data': {
    id: 'interface-data',
    icon: Settings2,
    title: 'Оформление и данные',
    definition:
      'Основные настройки приложения: внешний вид, валюта, целевые показатели питания и другие параметры, которые влияют на всё приложение.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Боковая панель',
        sectionId: 'home-sidebar',
      },
    ],
    impacts: [
      {
        title: 'Отображение валют',
        description: 'Выбранная валюта используется во всех финансовых разделах (счета, доходы, расходы) для отображения сумм.',
      },
      {
        title: 'Цели питания',
        description: 'Целевые показатели калорий и макронутриентов влияют на прогресс в разделе "Питание" и рассчитываемые проценты.',
      },
      {
        title: 'Оформление интерфейса',
        description: 'Тема и цветовая схема применяется ко всему приложению и влияет на видимость всех элементов.',
      },
    ],
    fields: [
      {
        name: 'Валюта',
        type: 'select',
        required: true,
        description: 'Код валюты (RUB, USD, EUR и т.д.). Используется во всех финансовых разделах.',
      },
      {
        name: 'Целевые калории',
        type: 'number',
        required: false,
        description: 'Ежедневная цель по калориям для раздела "Питание".',
      },
      {
        name: 'Целевые белки (г)',
        type: 'number',
        required: false,
        description: 'Ежедневная цель по белкам для раздела "Питание".',
      },
      {
        name: 'Целевые жиры (г)',
        type: 'number',
        required: false,
        description: 'Ежедневная цель по жирам для раздела "Питание".',
      },
      {
        name: 'Целевые углеводы (г)',
        type: 'number',
        required: false,
        description: 'Ежедневная цель по углеводам для раздела "Питание".',
      },
      {
        name: 'Тема оформления',
        type: 'select',
        required: false,
        description: 'Выбор темы: светлая, тёмная или автоматическая смена по времени.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Сброс всех данных',
        description:
          'Полная очистка всех настроек и данных приложения с возвратом к заводским настройкам. Действие необратимо.',
        example: 'Используется при переносе на новое устройство или полной переинсталляции.',
      },
    ],
  },

  'rituals-morning': {
    id: 'rituals-morning',
    icon: Sun,
    title: 'Утренние ритуалы',
    definition:
      'Список действий, которые вы хотите выполнить каждое утро. Отслеживание выполнения помогает развивать привычку.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Карточка утренних ритуалов',
      },
      {
        page: 'Ритуалы',
        section: 'Чек-лист утра',
      },
    ],
    impacts: [
      {
        title: 'Карточка на главной',
        description: 'Активные ритуалы отображаются в карточке "Ритуалы" на главной странице с отслеживанием прогресса.',
      },
      {
        title: 'Страница Ритуалы',
        description: 'Полный чек-лист всех утренних ритуалов для проверки выполнения каждое утро.',
      },
      {
        title: 'Прогресс дня',
        description: 'Выполненные ритуалы влияют на общий прогресс категории "Ритуалы" в статистике.',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название ритуала (например: "Медитация", "Холодный душ").',
      },
      {
        name: 'Описание',
        type: 'textarea',
        required: false,
        description:
          'Дополнительное описание ритуала. Показывается в карточке и в конце списка на странице Ритуалы.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons (без расширения, например: "sun", "heart").',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке. Меньшее число — выше в списке.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'tasks-rituals',
        reason: 'Задачи типа "Ритуал" с привязкой к утру отображаются рядом с утренними ритуалами.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Активация/деактивация',
        description: 'Неактивные ритуалы не показываются в чек-листе, но хранятся в настройках.',
        example: 'Можно временно отключить ритуал без удаления, чтобы потом вернуть.',
      },
      {
        name: 'Отслеживание прогресса',
        description:
          'Автоматический подсчёт выполненных ритуалов в день. Статистика помогает видеть прогресс.',
        example: 'На главной показывается "3/5" — три ритуала из пяти выполнены.',
      },
    ],
  },

  'rituals-evening': {
    id: 'rituals-evening',
    icon: Moon,
    title: 'Вечерние ритуалы',
    definition:
      'Список действий для вечера, которые помогают расслабиться и подготовиться к сну. Отслеживание выполнения вечерних привычек.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Карточка вечерних ритуалов',
        sectionId: 'home-rituals-evening',
      },
      {
        page: 'Ритуалы',
        section: 'Чек-лист вечера',
        sectionId: 'rituals-checklist-evening',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название ритуала (например: "Чтение", "Подготовка ко сну").',
      },
      {
        name: 'Описание',
        type: 'textarea',
        required: false,
        description: 'Дополнительное описание ритуала. Показывается в карточке и в конце списка.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons (без расширения, например: "moon", "book").',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке. Меньшее число — выше в списке.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'tasks-rituals',
        reason: 'Задачи типа "Ритуал" с привязкой к вечеру отображаются рядом с вечерними ритуалами.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Активация/деактивация',
        description: 'Неактивные ритуалы не показываются в чек-листе, но хранятся в настройках.',
        example: 'Можно отключить ритуал на время отпуска и потом вернуть.',
      },
      {
        name: 'Отслеживание прогресса',
        description: 'Подсчёт выполненных вечерних ритуалов за день для отслеживания привычек.',
        example: 'На главной показывается "2/4" — два ритуала из четырёх выполнены.',
      },
    ],
  },

  'rituals-vows': {
    id: 'rituals-vows',
    icon: Flame,
    title: 'Обеты',
    definition:
      'Краткие утверждения или обещания самому себе, которые вы хотите помнить каждый день. Они помогают оставаться сосредоточенным на главном.',
    usedOn: [
      {
        page: 'Ритуалы',
        section: 'Раздел обетов',
        sectionId: 'rituals-vows-section',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Краткое описание обета (например: "Я способен", "Здоровье прежде всего").',
      },
      {
        name: 'Описание',
        type: 'textarea',
        required: false,
        description: 'Развёрнутое объяснение обета. Показывается в списке под названием.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons (без расширения).',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Ежедневное напоминание',
        description:
          'Обеты отображаются на странице Ритуалы и в утренней карточке как вдохновляющее напоминание.',
        example: 'Каждое утро вы видите свои обеты перед началом дня.',
      },
    ],
  },

  'tasks-rituals': {
    id: 'tasks-rituals',
    icon: Sparkles,
    title: 'Задачи — практики',
    definition:
      'Привычки и практики, которые вы хотите развивать ежедневно. Эта категория отслеживает выполнение важных действий для личного развития.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Категория "Практики" в карточке задач',
        sectionId: 'home-tasks-rituals',
      },
      {
        page: 'Ритуалы',
        section: 'Задачи категории "Практики"',
        sectionId: 'rituals-tasks-section',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название практики (например: "Медитация", "Утренняя пробежка").',
      },
      {
        name: 'Тип задачи',
        type: 'select',
        required: true,
        description:
          'Как задача отображается: Чекбокс (да/нет), Число (числовая цель), Ритуал (привязка к утру/вечеру), Питание, Список.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons для отображения в списке.',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в категории на главной.',
      },
      {
        name: 'Вид ритуала (для типа Ритуал)',
        type: 'select',
        required: false,
        description: 'Привязка к утру, вечеру или дню (только если тип задачи = "Ритуал").',
      },
      {
        name: 'Цель (число)',
        type: 'number',
        required: false,
        description: 'Числовая цель в день (используется для типа "Число", например: 10 отжиманий).',
      },
      {
        name: 'Единица',
        type: 'text',
        required: false,
        description:
          'Единица измерения (например: "шт", "раз", "км"). Подпись к числовой цели и к прогрессу.',
      },
      {
        name: 'Цель таймера (ч)',
        type: 'number',
        required: false,
        description:
          'Плановое время в часах (используется редко, для нечастых типов задач). Может быть 0.5, 1, 1.5 и т.д.',
      },
      {
        name: 'Необязательная',
        type: 'checkbox',
        required: false,
        description: 'Если включено, задача не влияет на общий прогресс категории.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'rituals-morning',
        reason:
          'Задачи типа "Ритуал" с привязкой "Утренний" отображаются в утренних ритуалах и карточке утра.',
      },
      {
        sectionId: 'rituals-evening',
        reason: 'Задачи типа "Ритуал" с привязкой "Вечерний" отображаются в вечерних ритуалах и карточке вечера.',
      },
      {
        sectionId: 'nutrition-products',
        reason: 'Задачи типа "Питание" используют продукты для отслеживания калорий.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Числовые цели',
        description: 'Отслеживание прогресса для числовых целей (например: 10 раз в день).',
        example: 'Задача "Отжимания" с целью 10 за день будет показывать прогресс как "3/10".',
      },
      {
        name: 'Таймер для практик',
        description: 'Возможность привязать таймер к задаче для отслеживания времени.',
        example: 'Задача "Медитация" может иметь цель 20 минут, вы запускаете таймер при выполнении.',
      },
      {
        name: 'Типы задач',
        description: 'Гибкая типизация: чекбокс для простого отслеживания, число для целей, ритуал для привязки.',
        example: 'Одна практика может быть просто "галочкой", другая — с числовой целью.',
      },
    ],
  },

  'tasks-time': {
    id: 'tasks-time',
    icon: ListTodo,
    title: 'Задачи — фокус',
    definition:
      'Задачи для отслеживания сосредоточенной работы. Эта категория помогает видеть, сколько времени вы посвящаете важным делам каждый день.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Категория "Фокус" в карточке задач',
        sectionId: 'home-tasks-time',
      },
      {
        page: 'Таймер',
        section: 'Список задач для запуска таймера',
        sectionId: 'timer-tasks-list',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название задачи (например: "Программирование", "Писательство").',
      },
      {
        name: 'Тип задачи',
        type: 'select',
        required: true,
        description:
          'Способ отслеживания: Чекбокс, Число, Таймер (для замера времени), Питание, Список.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons.',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в категории на главной и в списке таймера.',
      },
      {
        name: 'Цель (число)',
        type: 'number',
        required: false,
        description: 'Числовая цель (например: 5 для 5 сеансов фокуса).',
      },
      {
        name: 'Единица',
        type: 'text',
        required: false,
        description: 'Единица измерения числовой цели (например: "сеанс", "часов", "дел").',
      },
      {
        name: 'Цель таймера (ч)',
        type: 'number',
        required: true,
        description: 'Плановое время в часах для категории "Фокус" (например: 4 часа в день).',
      },
      {
        name: 'Необязательная',
        type: 'checkbox',
        required: false,
        description: 'Если включено, не влияет на общий прогресс категории.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Таймер',
        description:
          'Встроенный таймер для отслеживания времени, потраченного на каждую задачу фокуса за день.',
        example: 'Вы запускаете таймер при начале работы и останавливаете при перерыве. Время суммируется.',
      },
      {
        name: 'Статистика времени',
        description: 'Показывает, сколько часов вы уделили фокусу за день, неделю, месяц.',
        example: 'На главной видно "2.5 / 4 ч" — вы потратили 2.5 часа из плановых 4 часов.',
      },
      {
        name: 'Интеграция с главной',
        description: 'Категория фокуса высвечивает прогресс по времени прямо на главной странице.',
        example: 'Быстрый взгляд на главную показывает, достаточно ли вы сосредоточены сегодня.',
      },
    ],
  },

  'tasks-body': {
    id: 'tasks-body',
    icon: Activity,
    title: 'Задачи — здоровье',
    definition:
      'Задачи для отслеживания физического здоровья: упражнения, спорт, растяжка и другие активности для тела.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Категория "Здоровье" в карточке задач',
        sectionId: 'home-tasks-body',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название упражнения или активности (например: "Тренировка", "Йога").',
      },
      {
        name: 'Тип задачи',
        type: 'select',
        required: true,
        description: 'Способ отслеживания: Чекбокс, Число, Таймер, Питание, Список.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons.',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в категории на главной.',
      },
      {
        name: 'Цель (число)',
        type: 'number',
        required: false,
        description: 'Числовая цель (например: 30 для 30 минут или повторений).',
      },
      {
        name: 'Единица',
        type: 'text',
        required: false,
        description: 'Единица измерения (например: "мин", "раз", "км").',
      },
      {
        name: 'Цель таймера (ч)',
        type: 'number',
        required: true,
        description: 'Плановое время активности в день (например: 1 час).',
      },
      {
        name: 'Необязательная',
        type: 'checkbox',
        required: false,
        description: 'Если включено, не влияет на общий прогресс категории.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Отслеживание активности',
        description: 'Фиксирование времени физической активности с помощью встроенного таймера.',
        example: 'Вы запускаете таймер перед тренировкой и видите, сколько времени потратили.',
      },
      {
        name: 'Числовые цели',
        description: 'Отслеживание повторений, подходов или расстояния для упражнений.',
        example: 'Задача "Приседания" с целью 50 раз в день.',
      },
    ],
  },

  'tasks-deps': {
    id: 'tasks-deps',
    icon: Ban,
    title: 'Задачи — пороки',
    definition:
      'Задачи для отслеживания вредных привычек, которые вы хотите преодолеть. Поддержание нулевого прогресса означает успех.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Категория "Пороки" в карточке задач',
        sectionId: 'home-tasks-deps',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description:
          'Название привычки, которую нужно преодолеть (например: "Прокрастинация", "Соцсети").',
      },
      {
        name: 'Тип задачи',
        type: 'select',
        required: true,
        description: 'Способ отслеживания (обычно Число или Таймер для фиксирования срывов).',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons.',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в категории.',
      },
      {
        name: 'Цель (число)',
        type: 'number',
        required: false,
        description: 'Обычно 0 — вы хотите минимизировать или исключить привычку.',
      },
      {
        name: 'Единица',
        type: 'text',
        required: false,
        description: 'Единица срывов (например: "раз", "часов").',
      },
      {
        name: 'Цель таймера (ч)',
        type: 'number',
        required: true,
        description: 'Плановое время (0 часов = полное исключение).',
      },
      {
        name: 'Необязательная',
        type: 'checkbox',
        required: false,
        description: 'Если включено, не влияет на общий прогресс.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Отслеживание срывов',
        description:
          'Запись моментов, когда вы поддались привычке, для анализа и улучшения самоконтроля.',
        example: 'Если вы потратили 2 часа в соцсетях, вы записываете это число в категорию "Пороки".',
      },
      {
        name: 'Мотивация к нулю',
        description: 'Система нацелена на минимизацию или полное исключение вредной привычки.',
        example: 'Идеальное состояние — 0 / 0, то есть вы полностью избежали привычки в день.',
      },
    ],
  },

  'finance-accounts': {
    id: 'finance-accounts',
    icon: PiggyBank,
    title: 'Счета',
    definition:
      'Финансовые счета для отслеживания денег: наличный кошелёк, банковские карты, вклады. Каждый счёт имеет независимый баланс.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Виджет балансов (боковая панель)',
      },
      {
        page: 'Финансы',
        section: 'Список счетов и транзакций',
      },
      {
        page: 'Диалоги',
        section: 'При добавлении доходов и расходов',
      },
    ],
    impacts: [
      {
        title: 'Виджет на главной',
        description: 'Счёта с флагом "Показывать на главной" отображаются в боковой панели (максимум 3 видимых).',
      },
      {
        title: 'Балансы и статистика',
        description: 'Все транзакции относятся к конкретным счетам, что влияет на их баланс и финансовую статистику.',
      },
      {
        title: 'Выбор при вводе',
        description: 'При добавлении дохода или расхода нужно выбрать счёт, на который/с которого идёт перевод.',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Подпись счёта (например: "Основная карта", "Наличные", "Накопления").',
      },
      {
        name: 'Тип',
        type: 'select',
        required: true,
        description:
          'Обычный (для повседневных расходов) или Накопления (для целевых сбережений и выделения на главной).',
      },
      {
        name: 'Показывать на главной',
        type: 'checkbox',
        required: false,
        description: 'Если включено, баланс счёта видна в виджете боковой панели (максимум 3 счета).',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для отображения в списках (например: "wallet", "card").',
      },
      {
        name: 'Цвет',
        type: 'color',
        required: false,
        description: 'Цвет для выделения счёта в финансовых списках.',
      },
      {
        name: 'Баланс',
        type: 'number',
        required: false,
        description: 'Текущее количество денег на счёте в валюте приложения. Обновляется при транзакциях.',
      },
      {
        name: 'Цель',
        type: 'number',
        required: false,
        description: 'Опционально: плановая сумма на счёте (для отслеживания прогресса накопления).',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в выпадающих списках выбора счётов.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'interface-data',
        reason: 'Валюта счётов устанавливается в разделе "Оформление и данные".',
      },
      {
        sectionId: 'finance-income',
        reason: 'Доходы относятся к конкретным счетам.',
      },
      {
        sectionId: 'finance-expense',
        reason: 'Расходы списываются с конкретных счетов.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Виджет главной',
        description:
          'Быстрый просмотр баланса основных счетов прямо на главной странице (максимум 3 видимых счета).',
        example: 'Вы видите баланс основной карты и наличных без переходов в финансы.',
      },
      {
        name: 'Отслеживание целей',
        description: 'Для накопительных счетов можно установить цель и видеть прогресс накопления.',
        example: 'Счёт "Отпуск" имеет цель 50000 рублей, а текущий баланс 35000 — прогресс 70%.',
      },
      {
        name: 'Независимые балансы',
        description: 'Каждый счёт ведёт свою историю транзакций и баланса независимо от других.',
        example: 'Наличные и карта имеют разные балансы и разные истории платежей.',
      },
    ],
  },

  'finance-income': {
    id: 'finance-income',
    icon: TrendingUp,
    title: 'Доходы',
    definition:
      'Категории входящих денег: зарплата, подработка, подарки и другие источники дохода. Используются для классификации и анализа доходов.',
    usedOn: [
      {
        page: 'Финансы',
        section: 'Статистика доходов',
        sectionId: 'finance-stats-income',
      },
      {
        page: 'Диалог добавления транзакции',
        section: 'Выбор категории дохода',
        sectionId: 'add-transaction-dialog-income',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название категории дохода (например: "Зарплата", "Фриланс", "Подарок").',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons для визуального отличия.',
      },
      {
        name: 'Цвет',
        type: 'color',
        required: false,
        description: 'Цвет для выделения категории в графиках и списках доходов.',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке категорий.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'finance-accounts',
        reason: 'Доходы добавляются на конкретные счета.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Анализ доходов',
        description: 'Статистика по источникам дохода: сколько вы заработали из каждой категории.',
        example: 'За месяц: Зарплата 100000, Фриланс 20000, Подарки 5000.',
      },
      {
        name: 'Группировка по категориям',
        description: 'Удобное разделение различных источников дохода для анализа.',
        example: 'Основной доход, дополнительные заработки и непредвиденные доходы учитываются отдельно.',
      },
    ],
  },

  'finance-expense': {
    id: 'finance-expense',
    icon: TrendingDown,
    title: 'Расходы',
    definition:
      'Категории трат: продукты, транспорт, развлечения, коммунальные платежи и прочие расходы. Помогает контролировать и анализировать траты.',
    usedOn: [
      {
        page: 'Финансы',
        section: 'Статистика расходов и анализ',
        sectionId: 'finance-stats-expense',
      },
      {
        page: 'Диалог добавления транзакции',
        section: 'Выбор категории расхода',
        sectionId: 'add-transaction-dialog-expense',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description:
          'Название категории расходов (например: "Продукты", "Транспорт", "Развлечения", "Жильё").',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для визуального отличия.',
      },
      {
        name: 'Цвет',
        type: 'color',
        required: false,
        description: 'Цвет для выделения в графиках расходов.',
      },
      {
        name: 'Импульсивная покупка',
        type: 'checkbox',
        required: false,
        description: 'Если включено, эта категория считается импульсивной тратой и выделяется отдельно.',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'finance-accounts',
        reason: 'Расходы списываются с конкретных счетов.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Анализ импульсивных покупок',
        description:
          'Отдельное выделение импульсивных трат для осознания и контроля спонтанных расходов.',
        example: 'Категория "Кофе" или "Сладости" помечена как импульсивная и выделяется в анализе.',
      },
      {
        name: 'Статистика по категориям',
        description: 'Подробный анализ того, куда уходят деньги: какие категории требуют внимания.',
        example: 'Диаграмма показывает, что 40% расходов на продукты, 20% на транспорт, 15% на развлечения.',
      },
      {
        name: 'Бюджетирование',
        description: 'Возможность установить лимиты на категории и отслеживать соблюдение бюджета.',
        example: 'Вы установили лимит 5000 на развлечения в месяц и видите прогресс.',
      },
    ],
  },

  'leisure-filling': {
    id: 'leisure-filling',
    icon: Sparkles,
    title: 'Досуг — наполнение',
    definition:
      'Активности, которые наполняют жизнь смыслом и приносят удовольствие: хобби, творчество, общение. Противоположность "пассивному" развлечению.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Категория досуга "Наполнение"',
        sectionId: 'home-leisure-filling',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название активности (например: "Рисование", "Гитара", "Встречи с друзьями").',
      },
      {
        name: 'Тип',
        type: 'select',
        required: true,
        description:
          'Способ отслеживания: Чекбокс (да/нет), Число (часов/раз), Таймер (по времени), Питание, Список.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла из папки public/icons.',
      },
      {
        name: 'Цвет',
        type: 'color',
        required: false,
        description: 'Цвет для выделения (переопределяет стандартный цвет "наполнения").',
      },
      {
        name: 'Цель (число)',
        type: 'number',
        required: false,
        description: 'Числовая цель за день (например: 2 часа творчества).',
      },
      {
        name: 'Единица',
        type: 'text',
        required: false,
        description: 'Единица измерения (например: "часов", "раз", "минут").',
      },
      {
        name: 'Цель таймера (ч)',
        type: 'number',
        required: true,
        description: 'Плановое время активности в день.',
      },
      {
        name: 'Необязательная',
        type: 'checkbox',
        required: false,
        description: 'Если включено, не влияет на общий прогресс досуга.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Отслеживание смысленных активностей',
        description: 'Фиксирование времени, потраченного на активности, которые приносят удовлетворение.',
        example: 'Запуск таймера при рисовании или игре на музыкальном инструменте.',
      },
      {
        name: 'Баланс жизни',
        description: 'Помощь в достижении баланса между продуктивностью и наполняющими активностями.',
        example: 'Вы видите, достаточно ли времени уделили творчеству в день.',
      },
    ],
  },

  'leisure-escape': {
    id: 'leisure-escape',
    icon: Ghost,
    title: 'Досуг — эскапизм',
    definition:
      'Пассивное развлечение: интернет, фильмы, игры, соцсети. Полезны в меру, но имеют риск пассивного увлечения.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Категория досуга "Эскапизм"',
        sectionId: 'home-leisure-escape',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название активности (например: "Сериалы", "Игры", "Соцсети", "YouTube").',
      },
      {
        name: 'Тип',
        type: 'select',
        required: true,
        description: 'Способ отслеживания: Чекбокс, Число, Таймер, Питание, Список.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для визуального отличия.',
      },
      {
        name: 'Цвет',
        type: 'color',
        required: false,
        description: 'Цвет для выделения (переопределяет стандартный цвет "эскапизма").',
      },
      {
        name: 'Цель (число)',
        type: 'number',
        required: false,
        description: 'Числовая цель за день (например: максимум 2 часа в соцсетях).',
      },
      {
        name: 'Единица',
        type: 'text',
        required: false,
        description: 'Единица измерения (часов, раз и т.д.).',
      },
      {
        name: 'Цель таймера (ч)',
        type: 'number',
        required: true,
        description: 'Плановое максимальное время в день (рекомендуется ограничивать).',
      },
      {
        name: 'Необязательная',
        type: 'checkbox',
        required: false,
        description: 'Если включено, не влияет на общий прогресс.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Контроль пассивного времени',
        description: 'Помощь в осознании и ограничении времени, потраченного на пассивное развлечение.',
        example: 'Вы ставите лимит 2 часа на соцсети и видите в реальном времени, сколько осталось.',
      },
      {
        name: 'Сравнение с наполнением',
        description: 'На главной видно соотношение между смысленными активностями и развлечением.',
        example: 'Если вы потратили 4 часа на эскапизм и 0 часов на наполнение, система это покажет.',
      },
    ],
  },

  'ambient-music': {
    id: 'ambient-music',
    icon: Music,
    title: 'Фоновая музыка',
    definition:
      'Коллекция треков и плейлистов для фоновой музыки во время работы, отдыха или других активностей.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Панель управления музыкой',
        sectionId: 'home-music-player',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название плейлиста или трека (например: "Лес", "Кофейня", "Дождь").',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для отображения в плеере.',
      },
      {
        name: 'Файл музыки',
        type: 'text',
        required: false,
        description:
          'Имя mp3-файла из папки музыки. Папка определяется автоматически при запуске приложения.',
      },
    ],
    relatedSettings: [],
    additionalFunctions: [
      {
        name: 'Встроенный плеер',
        description: 'Быстрое включение фоновой музыки прямо с главной страницы.',
        example: 'Нажимаете на плейлист "Лес" — начинает играть фоновая музыка.',
      },
      {
        name: 'Автоматическое обнаружение папки музыки',
        description:
          'Приложение сканирует стандартную папку музыки вашей ОС и предлагает доступные файлы.',
        example: 'Вы кладёте mp3-файлы в папку музыки компьютера, они автоматически появляются в приложении.',
      },
      {
        name: 'Личная коллекция',
        description: 'Создание своей коллекции фоновых звуков и музыки для разных ситуаций.',
        example:
          'Плейлист "Работа": дождь + минимализм. Плейлист "Сон": природные звуки + спокойная музыка.',
      },
    ],
  },

  'diary-categories': {
    id: 'diary-categories',
    icon: BookHeart,
    title: 'Категории дневника',
    definition:
      'Типы записей в дневнике: события, мысли, переживания, идеи. Помогает структурировать и организовать заметки.',
    usedOn: [
      {
        page: 'Дневник',
        section: 'Селектор категории при создании записи',
        sectionId: 'diary-editor-category-select',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название категории (например: "События", "Мысли", "Идеи", "Переживания").',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description:
          'Имя SVG-файла из папки public/icons (как и для настроений, без расширения).',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в селекторе категорий.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'diary-moods',
        reason: 'Категории и настроения используются вместе при создании записи в дневнике.',
      },
      {
        sectionId: 'diary-entry-presets',
        reason: 'Цитаты и подсказки отображаются независимо от выбранной категории.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Организация записей',
        description: 'Структурирование дневных записей по типам для удобного навигирования.',
        example: 'Вы можете фильтровать записи по категориям или видеть статистику по типам записей.',
      },
      {
        name: 'Быстрый выбор при записи',
        description: 'При создании новой записи вы сразу указываете категорию для классификации.',
        example: 'Открываете дневник, выбираете "События", пишете, что произошло.',
      },
    ],
  },

  'diary-moods': {
    id: 'diary-moods',
    icon: Smile,
    title: 'Настроения',
    definition:
      'Шкала настроений от 1 до 5 с описаниями и цветами. Позволяет отслеживать эмоциональное состояние в дневнике и анализировать эмоциональные тренды.',
    usedOn: [
      {
        page: 'Дневник',
        section: 'Шкала настроений при создании записи',
        sectionId: 'diary-editor-mood-scale',
      },
      {
        page: 'Статистика',
        section: 'Графики и анализ настроений',
        sectionId: 'stats-mood-analysis',
      },
    ],
    fields: [
      {
        name: 'Уровень',
        type: 'number',
        required: true,
        description: 'Номер на шкале от 1 до 5 (1 = ужасно, 5 = прекрасно).',
      },
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Описание уровня настроения (например: "Ужасно", "Плохо", "Нормально", "Хорошо", "Прекрасно").',
      },
      {
        name: 'Цвет',
        type: 'color',
        required: false,
        description: 'Цвет для визуального отображения в статистике и шкале.',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для отображения на шкале (например: "sad", "smile", "heart").',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'diary-categories',
        reason: 'Настроения используются вместе с категориями при записи в дневник.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Отслеживание эмоций',
        description: 'Ежедневное фиксирование своего эмоционального состояния для анализа тенденций.',
        example: 'За месяц вы видите, в какие дни было лучше настроение, какие факторы на это влияют.',
      },
      {
        name: 'Статистика настроений',
        description: 'Автоматический анализ тренда настроений за неделю, месяц, год.',
        example: 'График показывает, что в выходные настроение лучше, чем в рабочие дни.',
      },
      {
        name: 'Кастомизация шкалы',
        description: 'Изменение описаний, цветов и иконок для каждого уровня под свои нужды.',
        example:
          'Вместо универсальных "Хорошо/Плохо" вы делаете "Энергия высокая/низкая" для отслеживания конкретного состояния.',
      },
    ],
  },

  'diary-entry-presets': {
    id: 'diary-entry-presets',
    icon: BookText,
    title: 'Цитаты записи',
    definition:
      'Подсказки, цитаты и вопросы, которые мотивируют писать в дневнике. Они случайно показываются в пустом поле при открытии дневника.',
    usedOn: [
      {
        page: 'Дневник',
        section: 'Подсказка в пустом поле записи',
        sectionId: 'diary-editor-prompt',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description:
          'Короткое название цитаты для списка и поиска (например: "Честный взгляд", "Благодарность").',
      },
      {
        name: 'Цитата / подсказка',
        type: 'textarea',
        required: true,
        description:
          'Текст, который показывается в качестве подсказки в пустом поле для записи (например: "Начни с одной честной строки").',
      },
      {
        name: 'Описание',
        type: 'textarea',
        required: false,
        description: 'Дополнительное объяснение или контекст к цитате (видно в настройках).',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для отображения в списке цитат.',
      },
      {
        name: 'Активная',
        type: 'checkbox',
        required: true,
        description: 'Если включено, цитата попадает в ротацию и может быть показана в дневнике.',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер в ротации; меньшее число означает более частое появление.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'diary-categories',
        reason: 'Цитаты показываются независимо от выбранной категории.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Ротация цитат',
        description: 'Система случайно выбирает активные цитаты для показа, стимулируя писать разнообразные записи.',
        example: 'Вы открываете дневник в понедельник — видите "Какие были главные события дня?", во вторник — "За что ты благодарен?".',
      },
      {
        name: 'Вдохновение для письма',
        description: 'Подсказки помогают преодолеть блокаду писателя и дают направление для размышления.',
        example: 'Человеку трудно начать писать, но предложение "Что тебя беспокоит?" помогает начать.',
      },
      {
        name: 'Активация и деактивация',
        description:
          'Вы можете отключить цитаты, которые вам больше не нравятся, без удаления из системы.',
        example: 'Неактивные цитаты не появляются в ротации, но сохраняются, если позже захотите их вернуть.',
      },
    ],
  },

  'nutrition-products': {
    id: 'nutrition-products',
    icon: Apple,
    title: 'Продукты питания',
    definition:
      'База данных продуктов с калорийностью и макронутриентами. Используется для быстрого ввода питания и расчёта макросов.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Карточка питания',
        sectionId: 'home-nutrition-card',
      },
      {
        page: 'Дневник',
        section: 'Диалог добавления питания — выбор продукта',
        sectionId: 'add-nutrition-dialog',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description:
          'Название продукта (например: "Куриное филе", "Яйцо", "Рис"). Показывается при добавлении питания.',
      },
      {
        name: 'Группа',
        type: 'select',
        required: true,
        description: 'Класс продукта для группировки: Белки, Жиры, Углеводы.',
      },
      {
        name: 'Вес порции (г)',
        type: 'number',
        required: true,
        description:
          'Базовая порция для быстрого ввода (обычно 100 г для калкулирования). При выборе порция автоматически подставляется.',
      },
      {
        name: 'Ккал / 100г',
        type: 'number',
        required: true,
        description: 'Калорийность продукта на 100 г. Базовое значение для расчёта калорий.',
      },
      {
        name: 'Белки / 100г',
        type: 'number',
        required: true,
        description: 'Количество белков в граммах на 100 г продукта.',
      },
      {
        name: 'Жиры / 100г',
        type: 'number',
        required: true,
        description: 'Количество жиров в граммах на 100 г.',
      },
      {
        name: 'Углеводы / 100г',
        type: 'number',
        required: true,
        description: 'Количество углеводов в граммах на 100 г.',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке продуктов.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'nutrition-presets',
        reason: 'Пресеты (готовые блюда) состоят из продуктов и их порций.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Быстрый ввод питания',
        description: 'Выбор продукта из списка и указание количества порций для быстрого расчёта калорий.',
        example: 'Вы выбираете "Куриное филе", указываете 2 порции (200 г) — система считает калории и макросы.',
      },
      {
        name: 'Расчёт макронутриентов',
        description: 'Автоматический расчёт белков, жиров и углеводов на основе выбранного продукта и количества.',
        example: 'Вы видите не только "200 ккал", но и "20 г белков, 5 г жиров, 10 г углеводов".',
      },
      {
        name: 'Группировка по группам',
        description: 'Удобное разделение продуктов на белки, жиры, углеводы для быстрого поиска.',
        example: 'При добавлении питания вы фильтруете по группе, чтобы найти нужный продукт быстрее.',
      },
    ],
  },

  'nutrition-presets': {
    id: 'nutrition-presets',
    icon: UtensilsCrossed,
    title: 'Блюда (пресеты)',
    definition:
      'Готовые рецепты и комбинации продуктов. Позволяет быстро добавлять сложные блюда одним кликом вместо выбора каждого ингредиента.',
    usedOn: [
      {
        page: 'Главная',
        section: 'Карточка питания',
        sectionId: 'home-nutrition-card',
      },
      {
        page: 'Дневник',
        section: 'Диалог добавления питания — выбор пресета',
        sectionId: 'add-nutrition-dialog-presets',
      },
    ],
    fields: [
      {
        name: 'Название',
        type: 'text',
        required: true,
        description: 'Название блюда (например: "Омлет с овощами", "Салат Цезарь", "Завтрак выходного дня").',
      },
      {
        name: 'Иконка',
        type: 'text',
        required: false,
        description: 'Имя SVG-файла для отображения в меню пресетов.',
      },
      {
        name: 'Состав (JSON)',
        type: 'json',
        required: true,
        description:
          'Массив продуктов и их порций в JSON-формате. Хранится в поле products в базе (сложное поле, редко редактируется руками).',
      },
      {
        name: 'Порядок',
        type: 'number',
        required: true,
        description: 'Номер для сортировки в списке пресетов.',
      },
    ],
    relatedSettings: [
      {
        sectionId: 'nutrition-products',
        reason: 'Каждый пресет состоит из продуктов. При изменении калорий продукта пресеты автоматически пересчитываются.',
      },
    ],
    additionalFunctions: [
      {
        name: 'Быстрое добавление блюд',
        description: 'Выбор готового пресета вместо долгого выбора каждого ингредиента по отдельности.',
        example: 'Вместо выбора "Яйцо + 2 шт", "Помидор + 50 г", "Масло + 10 г" просто выбираете "Омлет с овощами".',
      },
      {
        name: 'Кастомные рецепты',
        description: 'Создание собственных рецептов из часто используемых комбинаций продуктов.',
        example: 'Вы часто едите одинаковый завтрак — сохраняете его как пресет "Мой утренний завтрак".',
      },
      {
        name: 'Общие данные по блюду',
        description: 'При добавлении пресета вы видите сразу полные калории, белки, жиры, углеводы блюда.',
        example: 'Пресет "Омлет" показывает "250 ккал, 15 г белков, 12 г жиров, 5 г углеводов".',
      },
    ],
  },
};

export function getSettingsReference(sectionId: string): SettingsReference | undefined {
  return SETTINGS_REFERENCES[sectionId];
}
