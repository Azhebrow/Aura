// Пресеты данных для первого запуска приложения
// ВАЖНО: Используем стабильные ID для корректной работы INSERT OR REPLACE

// Иконка и цвет групп продуктов — синхронизировано с NutritionGroupPalette.js + UnifiedColorPalette.js
// Группы: Белки, Жиры, Углеводы, Блюда
const NUTRITION_GROUP_ICON_COLOR = {
  proteins: { icon: 'drumstick', color: 'hsl(200, 48%, 52%)' },
  fats: { icon: 'droplet', color: 'hsl(42, 52%, 52%)' },
  carbs: { icon: 'wheat', color: 'hsl(135, 42%, 48%)' },
  dishes: { icon: 'layers', color: 'hsl(35, 38%, 48%)' },
  other: { icon: 'circle', color: 'hsl(0, 0%, 55%)' }
};

function withGroupIconColor(products) {
  return products.map(p => ({
    ...p,
    icon: NUTRITION_GROUP_ICON_COLOR[p.group]?.icon || 'circle',
    color: NUTRITION_GROUP_ICON_COLOR[p.group]?.color || NUTRITION_GROUP_ICON_COLOR.other.color
  }));
}

function withGoalTaskDescriptions(tasks) {
  return tasks.map((task) => {
    if (typeof task.description === 'string' && task.description.trim()) return task;
    if (task.task_type === 'number') {
      const target = Number(task.target_value || 0);
      const unit = task.unit ? String(task.unit) : 'ед.';
      return {
        ...task,
        description: `Конкретная цель: достичь ${target} ${unit}. Засчитывается по фактическому значению за выбранный период.`,
      };
    }
    return {
      ...task,
      description: `Чекпоинт этапа: подтвердить выполнение задачи "${task.title}".`,
    };
  });
}

const PRESETS = {
  // УТРЕННИЕ РИТУАЛЫ
  ritualsMorning: [
    {
      id: 'r_morning_0',
      title: 'Медитация',
      description: 'Практика осознанности и внутреннего покоя',
      icon: 'brain',
      color: 'hsl(45, 97%, 68%)',  // --ritual-morning-1 (palette.css)
      active: 1,
      level: 0
    },
    {
      id: 'r_morning_1',
      title: 'Зарядка',
      description: 'Физическая активность для пробуждения тела и разума',
      icon: 'activity',
      color: 'hsl(45, 97%, 68%)',  // --ritual-morning-1 (palette.css)
      active: 1,
      level: 1
    },
    {
      id: 'r_morning_2',
      title: 'Планирование',
      description: 'Структурирование дня для максимальной продуктивности',
      icon: 'calendar',
      color: 'hsl(45, 97%, 68%)',  // --ritual-morning-1 (palette.css)
      active: 1,
      level: 2
    },
    {
      id: 'r_morning_3',
      title: 'Завтрак',
      description: 'Питательный завтрак для энергии и здоровья',
      icon: 'apple',
      color: 'hsl(45, 97%, 68%)',  // --ritual-morning-1 (palette.css)
      active: 1,
      level: 3
    }
  ],

  // ВЕЧЕРНИЕ РИТУАЛЫ
  ritualsEvening: [
    {
      id: 'r_evening_0',
      title: 'Благодарность',
      description: 'Практика благодарности за прожитый день',
      icon: 'book',
      color: 'hsl(270, 82%, 65%)',  // --ritual-evening-1 (palette.css)
      active: 1,
      level: 0
    },
    {
      id: 'r_evening_1',
      title: 'Подготовка',
      description: 'Подготовка к завтрашнему дню для спокойного утра',
      icon: 'moon',
      color: 'hsl(270, 82%, 65%)',  // --ritual-evening-1 (palette.css)
      active: 1,
      level: 1
    },
    {
      id: 'r_evening_2',
      title: 'Релаксация',
      description: 'Расслабляющие практики для качественного отдыха',
      icon: 'book-open',
      color: 'hsl(270, 82%, 65%)',  // --ritual-evening-1 (palette.css)
      active: 1,
      level: 2
    }
  ],

  // ОБЕТЫ
  // Стоические принципы. Ежедневные напоминания для осознанной жизни.
  vows: [
    {
      id: 'vow_0',
      title: 'Принятие реальности',
      description: `Есть вещи, которые я контролирую: мои мысли, решения, действия. Есть вещи вне моего контроля: поступки других людей, погода, экономика, болезни, смерть. Тратить энергию на второе значит терять силы впустую. Моя задача чётко разделять эти категории и работать только с первой.\n\nЖаловаться на обстоятельства бессмысленно. Обстоятельства не слышат жалоб. Они просто есть. Человек, который возмущается реальностью, похож на того, кто кричит на дождь. Дождь не перестанет. А человек потеряет голос и время. Принятие не означает пассивность. Это признание фактов как отправной точки для действий.\n\nКаждое препятствие содержит возможность. Болезнь учит ценить здоровье. Потеря учит не привязываться. Неудача показывает слабые места. Стоик не ищет страданий, но когда они приходят, извлекает из них пользу. Вопрос не почему это случилось со мной, а что я могу с этим сделать.`,
      icon: 'shield',
      level: 0
    },
    {
      id: 'vow_1',
      title: 'Дисциплина действия',
      description: `Мотивация ненадёжна. Она приходит и уходит. Дисциплина работает независимо от настроения. Делать то, что нужно, когда не хочется, это и есть сила воли. Не ждать подходящего момента. Подходящий момент это сейчас. Всегда сейчас.\n\nСлова ничего не стоят без действий. Планы остаются фантазиями, пока не превращаются в шаги. Человека определяют не намерения, а поступки. Можно годами говорить о переменах и ничего не менять. Можно молча начать и через год быть другим человеком. Выбор очевиден.\n\nКаждый день это тренировка. Маленькие победы над собой накапливаются. Встал когда не хотелось. Сделал когда было лень. Промолчал когда хотелось огрызнуться. Отказался когда тянуло согласиться. Из этих микрорешений складывается характер. Дисциплина это мышца. Она растёт от нагрузки и атрофируется от безделья.`,
      icon: 'target',
      level: 1
    },
    {
      id: 'vow_2',
      title: 'Ясность мышления',
      description: `Эмоции искажают восприятие. Страх преувеличивает угрозы. Гнев требует немедленной реакции. Желание обещает счастье от обладания. Всё это ловушки. Задача научиться наблюдать свои эмоции со стороны, не позволяя им управлять решениями.\n\nМежду стимулом и реакцией есть пространство. В этом пространстве свобода выбора. Животное реагирует автоматически. Человек способен остановиться и подумать. Использовать эту способность значит быть человеком в полном смысле. Не использовать значит жить на автопилоте.\n\nИстина важнее комфорта. Приятная ложь разрушает медленно, но верно. Неприятная правда болезненна, но она единственная основа для реальных изменений. Смотреть на себя честно. Признавать ошибки. Видеть свои слабости. Это не самобичевание, а диагностика. Нельзя починить то, что отказываешься замечать.`,
      icon: 'eye',
      level: 2
    },
    {
      id: 'vow_3',
      title: 'Смертность как учитель',
      description: `Memento mori. Помни о смерти. Не как о чём-то мрачном, а как о факте, который придаёт жизни вес. Время ограничено. Каждый день это невозобновляемый ресурс. Тратить его на мелочные конфликты, бессмысленные развлечения и пустые разговоры значит обкрадывать себя.\n\nСмерть обнуляет статус, богатство, славу. Остаётся только то, как ты прожил. Какие решения принимал. Как относился к людям. Что создал. Что преодолел. На смертном одре никто не жалеет, что мало работал или мало покупал. Жалеют о непрожитой жизни, о страхах, которые остановили, о словах, которые не сказали.\n\nОсознание конечности отрезвляет. Мелкие проблемы теряют значимость. Важное становится очевидным. Зачем откладывать то, что действительно имеет значение? Зачем терпеть то, что делает жизнь хуже? Зачем притворяться тем, кем не являешься? Времени мало. Его хватит только на главное.`,
      icon: 'clock',
      level: 3
    }
  ],

  // КАТЕГОРИИ ДНЕВНИКА
  diaryCategories: [
    {
      id: 'dcat_0',
      title: 'Важный день',
      description: 'День, который хочется отдельно отметить в хронике.',
      icon: 'calendar-heart',
      level: 0
    },
    {
      id: 'dcat_1',
      title: 'Достижение',
      description: 'Результат, победа или закрытый этап.',
      icon: 'trophy',
      level: 1
    },
    {
      id: 'dcat_2',
      title: 'Счастье',
      description: 'Теплый момент, благодарность, радость.',
      icon: 'sparkles',
      level: 2
    },
    {
      id: 'dcat_3',
      title: 'Поворот',
      description: 'Событие, которое меняет курс или взгляд.',
      icon: 'git-branch',
      level: 3
    },
    {
      id: 'dcat_4',
      title: 'Урок дня',
      description: 'Вывод, который важно не потерять.',
      icon: 'lightbulb',
      level: 4
    }
  ],

  // НАСТРОЕНИЯ
  diaryMoods: [
    {
      id: 'mood_1',
      level: 1,
      title: 'Тяжело',
      color: '#ef4444',
      icon: 'frown'
    },
    {
      id: 'mood_2',
      level: 2,
      title: 'Ниже нормы',
      color: '#f97316',
      icon: 'meh'
    },
    {
      id: 'mood_3',
      level: 3,
      title: 'Ровно',
      color: '#f59e0b',
      icon: 'minus'
    },
    {
      id: 'mood_4',
      level: 4,
      title: 'Хорошо',
      color: '#22c55e',
      icon: 'smile'
    },
    {
      id: 'mood_5',
      level: 5,
      title: 'Отлично',
      color: '#3b82f6',
      icon: 'laugh'
    }
  ],

  // СЧЕТА (цвета из palette.css)
  accounts: [
    {
      id: 'acc_0',
      title: 'Основной',
      type: 'regular',
      balance: 0,
      icon: 'building',
      color: 'hsl(198, 58%, 56%)',
      level: 0
    },
    {
      id: 'acc_1',
      title: 'Накопления',
      type: 'savings',
      balance: 0,
      target: 150000,
      icon: 'piggy-bank',
      color: 'hsl(206, 57%, 55%)',
      level: 1
    },
    {
      id: 'acc_2',
      title: 'Резерв',
      type: 'savings',
      balance: 0,
      target: 90000,
      icon: 'shield',
      color: 'hsl(214, 56%, 54%)',
      level: 2
    }
  ],

  // КАТЕГОРИИ ДОХОДОВ (цвета из palette.css)
  incomeCategories: [
    {
      id: 'inc_0',
      title: 'Зарплата',
      icon: 'briefcase',
      color: 'hsl(108, 55%, 55%)',
      level: 0
    },
    {
      id: 'inc_1',
      title: 'Подработка',
      icon: 'laptop',
      color: 'hsl(116, 54%, 54%)',
      level: 1
    },
    {
      id: 'inc_2',
      title: 'Подарки',
      icon: 'gift',
      color: 'hsl(124, 53%, 54%)',
      level: 2
    },
    {
      id: 'inc_3',
      title: 'Прочее',
      icon: 'circle',
      color: 'hsl(132, 52%, 53%)',
      level: 3
    }
  ],

  // КАТЕГОРИИ РАСХОДОВ (цвета из palette.css)
  expenseCategories: [
    {
      id: 'exp_0',
      title: 'Продукты',
      icon: 'shopping-cart',
      color: 'hsl(356, 58%, 57%)',
      type: '',
      description: 'Еда и напитки',
      level: 0
    },
    {
      id: 'exp_1',
      title: 'Транспорт',
      icon: 'car',
      color: 'hsl(2, 57%, 56%)',
      type: '',
      description: 'Проезд и топливо',
      level: 1
    },
    {
      id: 'exp_2',
      title: 'Коммуналка',
      icon: 'building',
      color: 'hsl(8, 56%, 55%)',
      type: '',
      description: 'Квартплата и услуги',
      level: 2
    },
    {
      id: 'exp_3',
      title: 'Здоровье',
      icon: 'heart-pulse',
      color: 'hsl(14, 55%, 54%)',
      type: 'compulsive',
      description: 'Аптека, БАДы и спонтанные покупки для самочувствия',
      level: 3
    },
    {
      id: 'exp_4',
      title: 'Развлечения',
      icon: 'film',
      color: 'hsl(20, 54%, 54%)',
      type: 'compulsive',
      description: 'Кино, подписки и спонтанный досуг',
      level: 4
    },
    {
      id: 'exp_5',
      title: 'Одежда и быт',
      icon: 'shirt',
      color: 'hsl(26, 53%, 54%)',
      type: 'compulsive',
      description: 'Одежда, товары для дома и незапланированные покупки',
      level: 5
    }
  ],

  // ЗАДАЧИ РИТУАЛОВ
  tasksRituals: [
    {
      id: 't_ritual_0',
      title: 'Утро',
      icon: 'target',
      task_type: 'ritual',
      category_type: 'rituals',
      ritual_type: 'sunrise',
      config: JSON.stringify({ ritualKind: 'morning' }),
      level: 0
    },
    {
      id: 't_ritual_1',
      title: 'Вечер',
      icon: 'sunset',
      task_type: 'ritual',
      category_type: 'rituals',
      ritual_type: 'sunset',
      config: JSON.stringify({ ritualKind: 'evening' }),
      level: 1
    },
    {
      id: 't_ritual_2',
      title: 'День',
      icon: 'sun',
      task_type: 'checkbox',
      category_type: 'rituals',
      config: JSON.stringify({}),
      level: 2
    }
  ],

  // ЗАДАЧИ ВРЕМЕНИ (ФОКУС)
  tasksTime: [
    {
      id: 't_time_0',
      title: 'Обучение',
      icon: 'book-open',
      task_type: 'timer',
      category_type: 'time',
      cfg_target_hours: 2,
      config: JSON.stringify({
        subtasks: [
          { name: 'Изучение', icon: 'book-open' },
          { name: 'Практика', icon: 'play' }
        ]
      }),
      level: 0
    },
    {
      id: 't_time_1',
      title: 'Английский',
      icon: 'languages',
      task_type: 'timer',
      category_type: 'time',
      cfg_target_hours: 1,
      config: JSON.stringify({
        subtasks: [
          { name: 'Чтение', icon: 'book' },
          { name: 'Разговор', icon: 'message-circle' }
        ]
      }),
      level: 1
    },
    {
      id: 't_time_2',
      title: 'Работа',
      icon: 'timer',
      task_type: 'timer',
      category_type: 'time',
      cfg_target_hours: 4,
      config: JSON.stringify({
        subtasks: [
          { name: 'Планирование', icon: 'calendar' },
          { name: 'Выполнение', icon: 'briefcase' }
        ]
      }),
      level: 2
    }
  ],

  // ЗАДАЧИ ТЕЛА (ЗДОРОВЬЕ)
  tasksBody: [
    {
      id: 't_body_0',
      title: 'Тренировка',
      icon: 'dumbbell',
      task_type: 'list',
      category_type: 'body',
      config: JSON.stringify({
        items: [
          { name: 'Нет', icon: 'x', percentage: 0 },
          { name: 'Легкая', icon: 'minus', percentage: 50 },
          { name: 'Интенсивная', icon: 'check', percentage: 100 }
        ]
      }),
      level: 0
    },
    {
      id: 't_body_1',
      title: 'Таблетки',
      icon: 'pill',
      task_type: 'checkbox',
      category_type: 'body',
      config: JSON.stringify({}),
      level: 1
    },
    {
      id: 't_body_2',
      title: 'Ккал',
      icon: 'apple',
      task_type: 'number',
      category_type: 'body',
      cfg_target_value: 2000,
      cfg_unit: 'ккал',
      config: JSON.stringify({ target: 2000, unit: 'ккал' }),
      level: 2
    }
  ],

  // ЗАДАЧИ ЗАВИСИМОСТЕЙ
  tasksDeps: [
    {
      id: 't_deps_0',
      title: 'Фастфуд',
      icon: 'hamburger',
      task_type: 'checkbox',
      category_type: 'deps',
      config: JSON.stringify({}),
      level: 0
    },
    {
      id: 't_deps_1',
      title: 'Сладкое',
      icon: 'candy',
      task_type: 'checkbox',
      category_type: 'deps',
      config: JSON.stringify({}),
      level: 1
    },
    {
      id: 't_deps_2',
      title: 'Алкоголь',
      icon: 'wine',
      task_type: 'checkbox',
      category_type: 'deps',
      config: JSON.stringify({}),
      level: 2
    }
  ],

  // ДОСУГ - НАПОЛНЕНИЕ
  leisureFilling: [
    {
      id: 'l_fill_0',
      title: 'Чтение',
      icon: 'book',
      task_type: 'timer',
      leisure_type: 'filling',
      cfg_target_hours: 1,
      color: 'hsl(48, 52%, 56%)',
      config: JSON.stringify({}),
      level: 0
    },
    {
      id: 'l_fill_1',
      title: 'Обучение',
      icon: 'graduation-cap',
      task_type: 'timer',
      leisure_type: 'filling',
      cfg_target_hours: 1,
      color: 'hsl(54, 51%, 56%)',
      config: JSON.stringify({}),
      level: 1
    },
    {
      id: 'l_fill_2',
      title: 'Творчество',
      icon: 'palette',
      task_type: 'timer',
      leisure_type: 'filling',
      cfg_target_hours: 1,
      color: 'hsl(30, 54%, 55%)',
      config: JSON.stringify({}),
      level: 2
    },
    {
      id: 'l_fill_3',
      title: 'Спорт',
      icon: 'dumbbell',
      task_type: 'timer',
      leisure_type: 'filling',
      cfg_target_hours: 1,
      color: 'hsl(18, 56%, 55%)',
      config: JSON.stringify({}),
      level: 3
    }
  ],

  // ДОСУГ - ЭСКАПИЗМ
  leisureEscape: [
    {
      id: 'l_esc_0',
      title: 'Игры',
      icon: 'gamepad',
      task_type: 'timer',
      leisure_type: 'escape',
      cfg_target_hours: 1,
      color: 'hsl(182, 47%, 52%)',
      config: JSON.stringify({}),
      level: 0
    },
    {
      id: 'l_esc_1',
      title: 'Медиа',
      icon: 'clapperboard',
      task_type: 'timer',
      leisure_type: 'escape',
      cfg_target_hours: 1,
      color: 'hsl(214, 45%, 49%)',
      config: JSON.stringify({}),
      level: 1
    },
    {
      id: 'l_esc_2',
      title: 'Социальное',
      icon: 'users',
      task_type: 'timer',
      leisure_type: 'escape',
      cfg_target_hours: 1,
      color: 'hsl(230, 44%, 49%)',
      config: JSON.stringify({}),
      level: 2
    },
    {
      id: 'l_esc_3',
      title: 'Релакс',
      icon: 'moon',
      task_type: 'timer',
      leisure_type: 'escape',
      cfg_target_hours: 1,
      color: 'hsl(262, 42%, 52%)',
      config: JSON.stringify({}),
      level: 3
    }
  ],

  // ЦЕЛИ
  goals: [
    {
      id: 'goal_0',
      title: 'Python: с нуля до первого проекта (12 месяцев)',
      description: 'Написать и выложить на GitHub 3 рабочих проекта, уметь автоматизировать задачи и понимать основы backend.',
      icon: 'target',
      color: '#3b82f6',
      level: 0
    },
    {
      id: 'goal_1',
      title: 'Гитара: с нуля до уверенной игры (12 месяцев)',
      description: 'Свободно играть 20+ песен, знать основы теории, уметь подбирать на слух простые песни и выступить для друзей.',
      icon: 'music',
      color: '#f59e0b',
      level: 1
    },
    {
      id: 'goal_2',
      title: 'Английский: с нуля до B2 (12 месяцев)',
      description: 'Сдать тест B2 (Cambridge B2 First или EF SET), свободно общаться, смотреть фильмы без субтитров и писать письма.',
      icon: 'languages',
      color: '#10b981',
      level: 2
    }
  ],

  // ЭТАПЫ ЦЕЛЕЙ
  goalStages: [
    // Этапы для "Python" (goal_0)
    {
      id: 'stage_0_0',
      goal_id: 'goal_0',
      title: 'Основы синтаксиса (мес 1-3)',
      description: 'Переменные, циклы, функции, строки, списки и словари на автомате.',
      icon: 'book-open',
      order_index: 0
    },
    {
      id: 'stage_0_1',
      goal_id: 'goal_0',
      title: 'Углубление и ООП (мес 4-6)',
      description: 'ООП, файлы, API, работа с библиотеками и первые реальные скрипты.',
      icon: 'activity',
      order_index: 1
    },
    {
      id: 'stage_0_2',
      goal_id: 'goal_0',
      title: 'Первый настоящий проект (мес 7-9)',
      description: 'Web с Flask, SQL, деплой и первый проект в портфолио.',
      icon: 'globe',
      order_index: 2
    },
    {
      id: 'stage_0_3',
      goal_id: 'goal_0',
      title: 'Портфолио и уверенность (мес 10-12)',
      description: 'Довести до 3 проектов на GitHub и закрепить уровень уверенного джуна.',
      icon: 'briefcase',
      order_index: 3
    },
    // Этапы для "Гитара" (goal_1)
    {
      id: 'stage_1_0',
      goal_id: 'goal_1',
      title: 'Первые звуки (мес 1-3)',
      description: 'Базовые аккорды, первые песни и стабильная ежедневная практика.',
      icon: 'music',
      order_index: 0
    },
    {
      id: 'stage_1_1',
      goal_id: 'goal_1',
      title: 'Уверенный бой и перебор (мес 4-6)',
      description: 'Баррэ, fingerpicking и рост репертуара до 13 песен.',
      icon: 'activity',
      order_index: 1
    },
    {
      id: 'stage_1_2',
      goal_id: 'goal_1',
      title: 'Теория и разнообразие (мес 7-9)',
      description: 'Пентатоника, блюз, подбор на слух и запись себя на видео.',
      icon: 'book-open',
      order_index: 2
    },
    {
      id: 'stage_1_3',
      goal_id: 'goal_1',
      title: 'Репертуар и выступление (мес 10-12)',
      description: 'Отполировать лучшие песни, сыграть публично и записать видео.',
      icon: 'mic',
      order_index: 3
    },
    // Этапы для "Английский" (goal_2)
    {
      id: 'stage_2_0',
      goal_id: 'goal_2',
      title: 'Фундамент A1 (мес 1-3)',
      description: 'Базовый словарный запас, простые предложения и понимание медленной речи.',
      icon: 'book-text',
      order_index: 0
    },
    {
      id: 'stage_2_1',
      goal_id: 'goal_2',
      title: 'Выход на A2 (мес 4-6)',
      description: 'Закрыть Essential Grammar, нарастить словарь до 2000 и начать живую практику.',
      icon: 'message-circle',
      order_index: 1
    },
    {
      id: 'stage_2_2',
      goal_id: 'goal_2',
      title: 'Рывок к B1 (мес 7-9)',
      description: 'Intermediate grammar, сериалы с субтитрами и регулярный speaking/writing.',
      icon: 'target',
      order_index: 2
    },
    {
      id: 'stage_2_3',
      goal_id: 'goal_2',
      title: 'Полировка до B2 (мес 10-12)',
      description: 'Добить грамматику, поднять словарь до 4500 и пройти финальные B2 тесты.',
      icon: 'graduation-cap',
      order_index: 3
    }
  ],

  // ЗАДАЧИ ЭТАПОВ
  goalTasks: withGoalTaskDescriptions([
    // Python: этап 1
    { id: 'task_0_0_0', stage_id: 'stage_0_0', title: '100 Days of Code (дни 1-40)', icon: 'book-open', task_type: 'number', target_value: 40, unit: 'уроков', order_index: 0 },
    { id: 'task_0_0_1', stage_id: 'stage_0_0', title: 'Codewars 8kyu-7kyu', icon: 'target', task_type: 'number', target_value: 50, unit: 'задач', order_index: 1 },
    { id: 'task_0_0_2', stage_id: 'stage_0_0', title: 'Настроить VS Code + Python + Git', icon: 'cog', task_type: 'checkbox', order_index: 2 },
    { id: 'task_0_0_3', stage_id: 'stage_0_0', title: 'Выложить первые решения на GitHub', icon: 'laptop', task_type: 'number', target_value: 10, unit: 'коммитов', order_index: 3 },
    { id: 'task_0_0_4', stage_id: 'stage_0_0', title: 'CS50P (первые 5 недель)', icon: 'graduation-cap', task_type: 'number', target_value: 5, unit: 'problem sets', order_index: 4 },

    // Python: этап 2
    { id: 'task_0_1_0', stage_id: 'stage_0_1', title: '100 Days of Code (дни 41-70)', icon: 'book-open', task_type: 'number', target_value: 30, unit: 'уроков', order_index: 0 },
    { id: 'task_0_1_1', stage_id: 'stage_0_1', title: 'Codewars 6kyu-5kyu', icon: 'target', task_type: 'number', target_value: 50, unit: 'задач', order_index: 1 },
    { id: 'task_0_1_2', stage_id: 'stage_0_1', title: 'Automate the Boring Stuff (главы 1-12)', icon: 'book-open', task_type: 'number', target_value: 12, unit: 'глав', order_index: 2 },
    { id: 'task_0_1_3', stage_id: 'stage_0_1', title: 'Скрипты-автоматизации для себя', icon: 'cpu', task_type: 'number', target_value: 5, unit: 'скриптов', order_index: 3 },
    { id: 'task_0_1_4', stage_id: 'stage_0_1', title: 'CS50P (недели 6-10 + финальный проект)', icon: 'graduation-cap', task_type: 'number', target_value: 6, unit: 'модулей/проект', order_index: 4 },

    // Python: этап 3
    { id: 'task_0_2_0', stage_id: 'stage_0_2', title: '100 Days of Code (дни 71-100, Flask)', icon: 'book-open', task_type: 'number', target_value: 30, unit: 'уроков', order_index: 0 },
    { id: 'task_0_2_1', stage_id: 'stage_0_2', title: 'Flask Mega-Tutorial', icon: 'book-open', task_type: 'number', target_value: 23, unit: 'глав', order_index: 1 },
    { id: 'task_0_2_2', stage_id: 'stage_0_2', title: 'SQLite + SQLAlchemy мини-проект', icon: 'file-text', task_type: 'checkbox', order_index: 2 },
    { id: 'task_0_2_3', stage_id: 'stage_0_2', title: 'Проект #1: веб-приложение с деплоем', icon: 'target', task_type: 'checkbox', order_index: 3 },
    { id: 'task_0_2_4', stage_id: 'stage_0_2', title: 'GitHub репозиторий с README и скриншотами', icon: 'laptop', task_type: 'checkbox', order_index: 4 },

    // Python: этап 4
    { id: 'task_0_3_0', stage_id: 'stage_0_3', title: 'Проект #2: Telegram-бот или CLI', icon: 'message-circle', task_type: 'checkbox', order_index: 0 },
    { id: 'task_0_3_1', stage_id: 'stage_0_3', title: 'Проект #3: парсер/дашборд', icon: 'chart-line', task_type: 'checkbox', order_index: 1 },
    { id: 'task_0_3_2', stage_id: 'stage_0_3', title: 'LeetCode Easy', icon: 'brain', task_type: 'number', target_value: 30, unit: 'задач', order_index: 2 },
    { id: 'task_0_3_3', stage_id: 'stage_0_3', title: 'Оформить GitHub-профиль', icon: 'users', task_type: 'checkbox', order_index: 3 },
    { id: 'task_0_3_4', stage_id: 'stage_0_3', title: 'Финальный тест TestDome/HackerRank', icon: 'check', task_type: 'checkbox', order_index: 4 },

    // Гитара: этап 1
    { id: 'task_1_0_0', stage_id: 'stage_1_0', title: 'Купить акустическую гитару', icon: 'shopping-cart', task_type: 'checkbox', order_index: 0 },
    { id: 'task_1_0_1', stage_id: 'stage_1_0', title: 'Тюнер-клипса или GuitarTuna', icon: 'music', task_type: 'checkbox', order_index: 1 },
    { id: 'task_1_0_2', stage_id: 'stage_1_0', title: 'Justin Guitar Beginner Grade 1', icon: 'play', task_type: 'number', target_value: 9, unit: 'уроков', order_index: 2 },
    { id: 'task_1_0_3', stage_id: 'stage_1_0', title: 'Базовые аккорды', icon: 'music', task_type: 'number', target_value: 8, unit: 'аккордов', order_index: 3 },
    { id: 'task_1_0_4', stage_id: 'stage_1_0', title: 'Связки аккордов без пауз (60 bpm)', icon: 'git-merge', task_type: 'number', target_value: 6, unit: 'связок', order_index: 4 },
    { id: 'task_1_0_5', stage_id: 'stage_1_0', title: 'Первые песни', icon: 'music', task_type: 'number', target_value: 5, unit: 'песен', order_index: 5 },
    { id: 'task_1_0_6', stage_id: 'stage_1_0', title: 'Практика 30 минут ежедневно', icon: 'clock', task_type: 'number', target_value: 90, unit: 'дней', order_index: 6 },

    // Гитара: этап 2
    { id: 'task_1_1_0', stage_id: 'stage_1_1', title: 'Justin Guitar Beginner Grade 2', icon: 'play', task_type: 'number', target_value: 9, unit: 'уроков', order_index: 0 },
    { id: 'task_1_1_1', stage_id: 'stage_1_1', title: 'Баррэ аккорды F и Bm', icon: 'activity', task_type: 'number', target_value: 2, unit: 'аккорда', order_index: 1 },
    { id: 'task_1_1_2', stage_id: 'stage_1_1', title: 'Паттерны перебора', icon: 'activity', task_type: 'number', target_value: 4, unit: 'паттерна', order_index: 2 },
    { id: 'task_1_1_3', stage_id: 'stage_1_1', title: 'Новые песни с перебором и баррэ', icon: 'music', task_type: 'number', target_value: 8, unit: 'песен', order_index: 3 },
    { id: 'task_1_1_4', stage_id: 'stage_1_1', title: 'Начать пользоваться Songsterr', icon: 'laptop', task_type: 'checkbox', order_index: 4 },
    { id: 'task_1_1_5', stage_id: 'stage_1_1', title: 'Научиться читать табулатуры', icon: 'file-text', task_type: 'checkbox', order_index: 5 },

    // Гитара: этап 3
    { id: 'task_1_2_0', stage_id: 'stage_1_2', title: 'Justin Guitar Beginner Grade 3', icon: 'play', task_type: 'number', target_value: 9, unit: 'уроков', order_index: 0 },
    { id: 'task_1_2_1', stage_id: 'stage_1_2', title: 'Пентатоника (2 позиции)', icon: 'waves', task_type: 'number', target_value: 2, unit: 'гаммы', order_index: 1 },
    { id: 'task_1_2_2', stage_id: 'stage_1_2', title: '12-тактовый блюз', icon: 'music', task_type: 'checkbox', order_index: 2 },
    { id: 'task_1_2_3', stage_id: 'stage_1_2', title: 'Новые песни разных жанров', icon: 'music', task_type: 'number', target_value: 7, unit: 'песен', order_index: 3 },
    { id: 'task_1_2_4', stage_id: 'stage_1_2', title: 'Подобрать песни на слух', icon: 'headphones', task_type: 'number', target_value: 3, unit: 'песни', order_index: 4 },
    { id: 'task_1_2_5', stage_id: 'stage_1_2', title: 'Запись себя на видео', icon: 'clapperboard', task_type: 'number', target_value: 3, unit: 'записи', order_index: 5 },

    // Гитара: этап 4
    { id: 'task_1_3_0', stage_id: 'stage_1_3', title: 'Личный сетлист', icon: 'list-checks', task_type: 'number', target_value: 10, unit: 'песен', order_index: 0 },
    { id: 'task_1_3_1', stage_id: 'stage_1_3', title: 'Сложные fingerstyle-песни', icon: 'music', task_type: 'number', target_value: 5, unit: 'песен', order_index: 1 },
    { id: 'task_1_3_2', stage_id: 'stage_1_3', title: 'Justin Guitar Intermediate Grade 1', icon: 'play', task_type: 'number', target_value: 5, unit: 'уроков', order_index: 2 },
    { id: 'task_1_3_3', stage_id: 'stage_1_3', title: 'Выступить для друзей/семьи/open mic', icon: 'mic', task_type: 'checkbox', order_index: 3 },
    { id: 'task_1_3_4', stage_id: 'stage_1_3', title: 'Записать и выложить видео', icon: 'arrow-up', task_type: 'checkbox', order_index: 4 },

    // Английский: этап 1
    { id: 'task_2_0_0', stage_id: 'stage_2_0', title: 'Duolingo English: раздел 1', icon: 'languages', task_type: 'number', target_value: 40, unit: 'уроков', order_index: 0 },
    { id: 'task_2_0_1', stage_id: 'stage_2_0', title: 'BBC Learning English курс', icon: 'headphones', task_type: 'number', target_value: 30, unit: 'уроков', order_index: 1 },
    { id: 'task_2_0_2', stage_id: 'stage_2_0', title: 'Anki: 5000 Most Common Words', icon: 'notebook', task_type: 'number', target_value: 1000, unit: 'слов', order_index: 2 },
    { id: 'task_2_0_3', stage_id: 'stage_2_0', title: 'Murphy Essential Grammar (1-40)', icon: 'book-open', task_type: 'number', target_value: 40, unit: 'юнитов', order_index: 3 },
    { id: 'task_2_0_4', stage_id: 'stage_2_0', title: 'Peppa Pig / Extra English', icon: 'clapperboard', task_type: 'number', target_value: 30, unit: 'серий', order_index: 4 },
    { id: 'task_2_0_5', stage_id: 'stage_2_0', title: 'Установить Cambridge Dictionary', icon: 'laptop', task_type: 'checkbox', order_index: 5 },

    // Английский: этап 2
    { id: 'task_2_1_0', stage_id: 'stage_2_1', title: 'Murphy Essential Grammar (41-100)', icon: 'book-open', task_type: 'number', target_value: 60, unit: 'юнитов', order_index: 0 },
    { id: 'task_2_1_1', stage_id: 'stage_2_1', title: 'Anki: еще слова (итого 2000)', icon: 'notebook', task_type: 'number', target_value: 1000, unit: 'слов', order_index: 1 },
    { id: 'task_2_1_2', stage_id: 'stage_2_1', title: 'Coursera English for Career Development', icon: 'briefcase', task_type: 'number', target_value: 5, unit: 'модулей', order_index: 2 },
    { id: 'task_2_1_3', stage_id: 'stage_2_1', title: 'BBC 6 Minute English', icon: 'headphones', task_type: 'number', target_value: 40, unit: 'эпизодов', order_index: 3 },
    { id: 'task_2_1_4', stage_id: 'stage_2_1', title: 'italki с community tutor', icon: 'message-circle', task_type: 'number', target_value: 12, unit: 'уроков', order_index: 4 },
    { id: 'task_2_1_5', stage_id: 'stage_2_1', title: 'EF SET промежуточный тест', icon: 'clipboard-check', task_type: 'checkbox', order_index: 5 },

    // Английский: этап 3
    { id: 'task_2_2_0', stage_id: 'stage_2_2', title: 'Murphy English Grammar in Use (1-60)', icon: 'book-open', task_type: 'number', target_value: 60, unit: 'юнитов', order_index: 0 },
    { id: 'task_2_2_1', stage_id: 'stage_2_2', title: 'Anki: еще слова (итого 3500)', icon: 'notebook', task_type: 'number', target_value: 1500, unit: 'слов', order_index: 1 },
    { id: 'task_2_2_2', stage_id: 'stage_2_2', title: 'Сериалы с английскими субтитрами', icon: 'clapperboard', task_type: 'number', target_value: 40, unit: 'серий', order_index: 2 },
    { id: 'task_2_2_3', stage_id: 'stage_2_2', title: 'Oxford Bookworms Level 4-5', icon: 'book', task_type: 'number', target_value: 2, unit: 'книги', order_index: 3 },
    { id: 'task_2_2_4', stage_id: 'stage_2_2', title: 'italki с professional teacher', icon: 'message-circle', task_type: 'number', target_value: 12, unit: 'уроков', order_index: 4 },
    { id: 'task_2_2_5', stage_id: 'stage_2_2', title: 'Короткие тексты (email/opinion/problem)', icon: 'pen-line', task_type: 'number', target_value: 10, unit: 'текстов', order_index: 5 },
    { id: 'task_2_2_6', stage_id: 'stage_2_2', title: 'EF SET: цель B1', icon: 'clipboard-check', task_type: 'checkbox', order_index: 6 },

    // Английский: этап 4
    { id: 'task_2_3_0', stage_id: 'stage_2_3', title: 'Murphy English Grammar in Use (61-145)', icon: 'book-open', task_type: 'number', target_value: 85, unit: 'юнитов', order_index: 0 },
    { id: 'task_2_3_1', stage_id: 'stage_2_3', title: 'Anki: еще слова (итого 4500)', icon: 'notebook', task_type: 'number', target_value: 1000, unit: 'слов', order_index: 1 },
    { id: 'task_2_3_2', stage_id: 'stage_2_3', title: 'Неадаптированные книги', icon: 'book-text', task_type: 'number', target_value: 2, unit: 'книги', order_index: 2 },
    { id: 'task_2_3_3', stage_id: 'stage_2_3', title: 'YouTube/Netflix без субтитров', icon: 'clapperboard', task_type: 'number', target_value: 30, unit: 'часов', order_index: 3 },
    { id: 'task_2_3_4', stage_id: 'stage_2_3', title: 'italki mock speaking tests', icon: 'message-circle', task_type: 'number', target_value: 12, unit: 'уроков', order_index: 4 },
    { id: 'task_2_3_5', stage_id: 'stage_2_3', title: 'Эссе формата B2 First', icon: 'pen-line', task_type: 'number', target_value: 5, unit: 'эссе', order_index: 5 },
    { id: 'task_2_3_6', stage_id: 'stage_2_3', title: 'Practice-тесты B2 First', icon: 'clipboard-list', task_type: 'number', target_value: 3, unit: 'теста', order_index: 6 },
    { id: 'task_2_3_7', stage_id: 'stage_2_3', title: 'EF SET финальный: цель B2', icon: 'check', task_type: 'checkbox', order_index: 7 }
  ]),

  // ПРОДУКТЫ ПИТАНИЯ (иконка и цвет из группы: Белки, Жиры, Углеводы, Блюда)
  nutritionProducts: withGroupIconColor([
    { id: 'nut_0', title: 'Куриная грудка', group: 'proteins', portion_weight: 150, calories_per_100g: 165, proteins_per_100g: 31, fats_per_100g: 3.6, carbs_per_100g: 0, level: 0 },
    { id: 'nut_2', title: 'Овсянка (сухая)', group: 'carbs', portion_weight: 50, calories_per_100g: 389, proteins_per_100g: 16.9, fats_per_100g: 6.9, carbs_per_100g: 66.3, level: 2 },
    { id: 'nut_3', title: 'Рис белый (сухой)', group: 'carbs', portion_weight: 100, calories_per_100g: 365, proteins_per_100g: 7.5, fats_per_100g: 0.6, carbs_per_100g: 78, level: 3 },
    { id: 'nut_4', title: 'Гречка (сухая)', group: 'carbs', portion_weight: 80, calories_per_100g: 343, proteins_per_100g: 13.3, fats_per_100g: 3.4, carbs_per_100g: 71.5, level: 4 },
    { id: 'nut_7', title: 'Банан', group: 'carbs', portion_weight: 120, calories_per_100g: 89, proteins_per_100g: 1.1, fats_per_100g: 0.3, carbs_per_100g: 22.8, level: 7 },
    { id: 'nut_8', title: 'Яблоко', group: 'carbs', portion_weight: 150, calories_per_100g: 52, proteins_per_100g: 0.3, fats_per_100g: 0.2, carbs_per_100g: 13.8, level: 8 },
    { id: 'nut_9', title: 'Брокколи', group: 'carbs', portion_weight: 200, calories_per_100g: 34, proteins_per_100g: 2.8, fats_per_100g: 0.4, carbs_per_100g: 6.6, level: 9 },
    { id: 'nut_10', title: 'Лосось', group: 'proteins', portion_weight: 150, calories_per_100g: 208, proteins_per_100g: 20, fats_per_100g: 13, carbs_per_100g: 0, level: 10 },
    { id: 'nut_11', title: 'Тунец', group: 'proteins', portion_weight: 150, calories_per_100g: 144, proteins_per_100g: 30, fats_per_100g: 1, carbs_per_100g: 0, level: 11 },
    { id: 'nut_12', title: 'Авокадо', group: 'fats', portion_weight: 100, calories_per_100g: 160, proteins_per_100g: 2, fats_per_100g: 15, carbs_per_100g: 8.5, level: 12 },
    { id: 'nut_15', title: 'Хлеб белый', group: 'carbs', portion_weight: 30, calories_per_100g: 266, proteins_per_100g: 7.7, fats_per_100g: 3.2, carbs_per_100g: 50.9, level: 15 },
    { id: 'nut_16', title: 'Хлеб цельнозерновой', group: 'carbs', portion_weight: 30, calories_per_100g: 247, proteins_per_100g: 13, fats_per_100g: 4.2, carbs_per_100g: 41.3, level: 16 },
    { id: 'nut_17', title: 'Макароны (сухие)', group: 'carbs', portion_weight: 100, calories_per_100g: 371, proteins_per_100g: 10.4, fats_per_100g: 1.1, carbs_per_100g: 74.7, level: 17 },
    { id: 'nut_18', title: 'Картофель', group: 'carbs', portion_weight: 200, calories_per_100g: 77, proteins_per_100g: 2, fats_per_100g: 0.4, carbs_per_100g: 16.1, level: 18 },
    { id: 'nut_19', title: 'Помидор', group: 'carbs', portion_weight: 150, calories_per_100g: 18, proteins_per_100g: 0.9, fats_per_100g: 0.2, carbs_per_100g: 3.9, level: 19 },
    { id: 'nut_20', title: 'Огурец', group: 'carbs', portion_weight: 150, calories_per_100g: 16, proteins_per_100g: 0.8, fats_per_100g: 0.1, carbs_per_100g: 2.8, level: 20 },
    { id: 'nut_21', title: 'Морковь', group: 'carbs', portion_weight: 100, calories_per_100g: 41, proteins_per_100g: 0.9, fats_per_100g: 0.2, carbs_per_100g: 9.6, level: 21 },
    { id: 'nut_24', title: 'Оливковое масло', group: 'fats', portion_weight: 15, calories_per_100g: 884, proteins_per_100g: 0, fats_per_100g: 100, carbs_per_100g: 0, level: 24 },
    { id: 'nut_25', title: 'Мед', group: 'carbs', portion_weight: 20, calories_per_100g: 304, proteins_per_100g: 0.3, fats_per_100g: 0, carbs_per_100g: 82.4, level: 25 },
    { id: 'nut_26', title: 'Яйцо куриное', group: 'proteins', portion_weight: 60, calories_per_100g: 155, proteins_per_100g: 13, fats_per_100g: 11, carbs_per_100g: 1.1, level: 26 },
    { id: 'nut_27', title: 'Молоко', group: 'proteins', portion_weight: 200, calories_per_100g: 64, proteins_per_100g: 3.2, fats_per_100g: 3.6, carbs_per_100g: 4.8, level: 27 },
    { id: 'nut_28', title: 'Сыр', group: 'proteins', portion_weight: 50, calories_per_100g: 350, proteins_per_100g: 25, fats_per_100g: 27, carbs_per_100g: 0, level: 28 },
    { id: 'nut_29', title: 'Творог', group: 'proteins', portion_weight: 150, calories_per_100g: 121, proteins_per_100g: 17, fats_per_100g: 5, carbs_per_100g: 3, level: 29 },
    { id: 'nut_30', title: 'Грецкие орехи', group: 'fats', portion_weight: 30, calories_per_100g: 654, proteins_per_100g: 15.2, fats_per_100g: 65.2, carbs_per_100g: 7, level: 30 }
  ]),

  // AMBIENT MUSIC не заполняется дефолтами: пользователь добавляет треки вручную.
  ambientMusic: []
};

// Экспортируем для CommonJS (для require в Node.js)
module.exports = { PRESETS };
module.exports.PRESETS = PRESETS;

