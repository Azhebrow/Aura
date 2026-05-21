export default {
  sections: {
    'rituals-morning': {
      title: 'Утренние ритуалы',
      description: '',
    },
    'rituals-evening': {
      title: 'Вечерние ритуалы',
      description: '',
    },
    'rituals-vows': {
      title: 'Обеты',
      description: '',
    },
    'tasks-rituals': {
      title: 'Задачи — практики',
      description: '',
    },
    'tasks-time': {
      title: 'Задачи — фокус',
      description: '',
    },
    'tasks-body': {
      title: 'Задачи — здоровье',
      description: '',
    },
    'tasks-deps': {
      title: 'Задачи — пороки',
      description: '',
    },
    'finance-accounts': {
      title: 'Счета',
      description: '',
    },
    'finance-income': {
      title: 'Категории доходов',
      description: '',
    },
    'finance-expense': {
      title: 'Категории расходов',
      description: '',
    },
    'leisure-filling': {
      title: 'Досуг — наполнение',
      description: '',
    },
    'leisure-escape': {
      title: 'Досуг — эскапизм',
      description: '',
    },
    'ambient-music': {
      title: 'Фоновая музыка',
      description: '',
    },
    'diary-categories': {
      title: 'Категории дневника',
      description: '',
    },
    'diary-moods': {
      title: 'Настроения дневника',
      description: '',
    },
    'diary-entry-presets': {
      title: 'Цитаты записи',
      description: '',
    },
    'nutrition-products': {
      title: 'Продукты питания',
      description: '',
    },
    'nutrition-presets': {
      title: 'Блюда (пресеты)',
      description: '',
    },
  },
  fields: {
    title: { label: 'Название', hint: '' },
    description: { label: 'Описание', hint: '' },
    icon: { label: 'Иконка', hint: '' },
    level: { label: 'Порядок', hint: '' },
    task_type: { label: 'Тип', hint: '' },
    ritual_type: { label: 'Вид ритуала', hint: '' },
    cfg_target_value: { label: 'Цель', hint: '' },
    cfg_unit: { label: 'Единица', hint: '' },
    cfg_target_hours: { label: 'Цель (часы)', hint: '' },
    config: { label: 'Пункты списка', hint: '' },
    is_optional: { label: 'Необязательная', hint: '' },
    type: { label: 'Тип', hint: '' },
    home_visible: { label: 'На главной', hint: '' },
    color: { label: 'Цвет', hint: '' },
    balance: { label: 'Баланс', hint: '' },
    target: { label: 'Цель', hint: '' },
    file_name: { label: 'Файл', hint: '' },
    name: { label: 'Название', hint: '' },
    prompt: { label: 'Подсказка', hint: '' },
    active: { label: 'Активная', hint: '' },
    portion_weight: { label: 'Вес порции (г)', hint: '' },
    calories_per_100g: { label: 'Ккал / 100г', hint: '' },
    proteins_per_100g: { label: 'Белки / 100г', hint: '' },
    fats_per_100g: { label: 'Жиры / 100г', hint: '' },
    carbs_per_100g: { label: 'Углеводы / 100г', hint: '' },
    products: { label: 'Состав', hint: '' },
  },
  options: {
    task_type: {
      checkbox: 'Чекбокс',
      number: 'Число',
      ritual: 'Ритуал',
      timer: 'Таймер',
      nutrition: 'Питание',
      list: 'Список',
    },
    ritual_type: {
      sunrise: 'Утренний',
      sunset: 'Вечерний',
      sun: 'Дневной',
    },
    account_type: {
      regular: 'Обычный',
      savings: 'Накопления',
    },
    nutrition_group: {
      proteins: 'Белки',
      fats: 'Жиры',
      carbs: 'Углеводы',
    },
    leisure_type: {
      checkbox: 'Чекбокс',
      number: 'Число',
      nutrition: 'Питание',
      timer: 'Таймер',
      list: 'Список',
    },
  },
  units: {
    num: '№',
    grams: 'г',
    calories: 'ккал',
    hours: 'ч',
    currency: 'вал.',
  },
} as const;
