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
    description: { label: 'Описание', hint: 'Показывается в карточке и внизу списка.' },
    icon: { label: 'Иконка (имя файла)', hint: 'Имя SVG в public/icons (без расширения).' },
    level: { label: 'Порядок', hint: 'Меньшее число — выше в списке.' },
    task_type: { label: 'Тип задачи', hint: 'Как задача отображается и отмечается на главной.' },
    ritual_type: { label: 'Вид ритуала', hint: 'Только для типа «Ритуал»: привязка к утру / вечеру / дню.' },
    cfg_target_value: { label: 'Цель (число)', hint: 'Для типа «Число»; единица подставляется из поля ниже.' },
    cfg_unit: { label: 'Единица', hint: 'Подпись к числовой цели.' },
    cfg_target_hours: { label: 'Цель таймера (ч)', hint: 'План в часах для таймера.' },
    config: { label: 'config (JSON для списка)', hint: 'Служебное поле для типа «Список»; по умолчанию пустой список.' },
    is_optional: { label: 'Необязательная', hint: 'Не влияет на прогресс категории, если включено.' },
    type: { label: 'Тип', hint: 'Накопительный счёт можно выделить для целей сбережения.' },
    home_visible: { label: 'Показывать на главной', hint: 'На домашней странице может быть видно максимум 3 счета.' },
    color: { label: 'Цвет', hint: 'Акцент категории в UI.' },
    balance: { label: 'Баланс', hint: 'Текущее значение в валюте приложения.' },
    target: { label: 'Цель', hint: 'Опционально: плановая сумма на счёте.' },
    file_name: { label: 'Файл музыки', hint: 'Выбирается из списка файлов в автоматически определённой папке музыки.' },
    name: { label: 'Название', hint: '' },
    prompt: { label: 'Цитата / подсказка', hint: 'Показывается в пустом поле записи вместо «Запись…».' },
    active: { label: 'Активная', hint: 'Неактивные фразы не попадают в ротацию.' },
    portion_weight: { label: 'Вес порции (г)', hint: 'Базовая порция для быстрого ввода (часто 100 г).' },
    calories_per_100g: { label: 'Ккал / 100г', hint: 'Энергия на 100 г продукта.' },
    proteins_per_100g: { label: 'Белки / 100г', hint: 'Граммы белка на 100 г.' },
    fats_per_100g: { label: 'Жиры / 100г', hint: 'Граммы жира на 100 г.' },
    carbs_per_100g: { label: 'Углеводы / 100г', hint: 'Граммы углеводов на 100 г.' },
    products: { label: 'Состав (JSON)', hint: 'Массив продуктов и порций: хранится в поле products в базе.' },
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
