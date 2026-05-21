export default {
  sections: {
    'rituals-morning': {
      title: 'Morning Rituals',
      description: '',
    },
    'rituals-evening': {
      title: 'Evening Rituals',
      description: '',
    },
    'rituals-vows': {
      title: 'Vows',
      description: '',
    },
    'tasks-rituals': {
      title: 'Tasks — Practices',
      description: '',
    },
    'tasks-time': {
      title: 'Tasks — Focus',
      description: '',
    },
    'tasks-body': {
      title: 'Tasks — Health',
      description: '',
    },
    'tasks-deps': {
      title: 'Tasks — Vices',
      description: '',
    },
    'finance-accounts': {
      title: 'Accounts',
      description: '',
    },
    'finance-income': {
      title: 'Income Categories',
      description: '',
    },
    'finance-expense': {
      title: 'Expense Categories',
      description: '',
    },
    'leisure-filling': {
      title: 'Leisure — Filling',
      description: '',
    },
    'leisure-escape': {
      title: 'Leisure — Escapism',
      description: '',
    },
    'ambient-music': {
      title: 'Ambient Music',
      description: '',
    },
    'diary-categories': {
      title: 'Diary Categories',
      description: '',
    },
    'diary-moods': {
      title: 'Diary Moods',
      description: '',
    },
    'diary-entry-presets': {
      title: 'Entry Quotes',
      description: '',
    },
    'nutrition-products': {
      title: 'Food Products',
      description: '',
    },
    'nutrition-presets': {
      title: 'Dishes (Presets)',
      description: '',
    },
  },
  fields: {
    title: { label: 'Name', hint: '' },
    description: { label: 'Description', hint: 'Shown in the card and at the bottom of the list.' },
    icon: { label: 'Icon (filename)', hint: 'SVG name in public/icons (without extension).' },
    level: { label: 'Order', hint: 'Lower number = higher in the list.' },
    task_type: { label: 'Task Type', hint: 'How the task is displayed and marked on the home page.' },
    ritual_type: { label: 'Ritual Type', hint: 'Only for "Ritual" type: binding to morning / evening / daytime.' },
    cfg_target_value: { label: 'Goal (number)', hint: 'For "Number" type; unit is substituted from the field below.' },
    cfg_unit: { label: 'Unit', hint: 'Label for the numeric goal.' },
    cfg_target_hours: { label: 'Timer Goal (h)', hint: 'Plan in hours for the timer.' },
    config: { label: 'config (JSON for list)', hint: 'Service field for "List" type; empty list by default.' },
    is_optional: { label: 'Optional', hint: 'Does not affect category progress if enabled.' },
    type: { label: 'Type', hint: 'Savings account can be highlighted for savings goals.' },
    home_visible: { label: 'Show on Home', hint: 'A maximum of 2 accounts can be visible on the home page.' },
    color: { label: 'Color', hint: 'Category accent in UI.' },
    balance: { label: 'Balance', hint: 'Current value in the app currency.' },
    target: { label: 'Goal', hint: 'Optional: planned amount on the account.' },
    file_name: { label: 'Music File', hint: 'Selected from files in the automatically determined music folder.' },
    name: { label: 'Name', hint: '' },
    prompt: { label: 'Quote / Hint', hint: 'Shown in empty entry field instead of "Entry…".' },
    active: { label: 'Active', hint: 'Inactive phrases do not enter the rotation.' },
    portion_weight: { label: 'Portion Weight (g)', hint: 'Base portion for quick input (often 100 g).' },
    calories_per_100g: { label: 'Kcal / 100g', hint: 'Energy per 100 g of product.' },
    proteins_per_100g: { label: 'Proteins / 100g', hint: 'Grams of protein per 100 g.' },
    fats_per_100g: { label: 'Fats / 100g', hint: 'Grams of fat per 100 g.' },
    carbs_per_100g: { label: 'Carbs / 100g', hint: 'Grams of carbohydrates per 100 g.' },
    products: { label: 'Composition (JSON)', hint: 'Array of products and portions: stored in products field in database.' },
  },
  options: {
    task_type: {
      checkbox: 'Checkbox',
      number: 'Number',
      ritual: 'Ritual',
      timer: 'Timer',
      nutrition: 'Nutrition',
      list: 'List',
    },
    ritual_type: {
      sunrise: 'Morning',
      sunset: 'Evening',
      sun: 'Daytime',
    },
    account_type: {
      regular: 'Regular',
      savings: 'Savings',
    },
    nutrition_group: {
      proteins: 'Proteins',
      fats: 'Fats',
      carbs: 'Carbs',
    },
    leisure_type: {
      checkbox: 'Checkbox',
      number: 'Number',
      nutrition: 'Nutrition',
      timer: 'Timer',
      list: 'List',
    },
  },
  units: {
    num: '№',
    grams: 'g',
    calories: 'kcal',
    hours: 'h',
    currency: 'cur.',
  },
} as const;
