export type CfgFieldKind = 'text' | 'textarea' | 'number' | 'color' | 'checkbox' | 'select';

export type CfgFieldDef = {
  key: string;
  label: string;
  kind: CfgFieldKind;
  /** Короткая подсказка под полем в форме редактирования */
  hint?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
  step?: number;
  min?: number;
  /** Статическая единица рядом со значением (CFG, вариант `inline`). */
  suffix?: string;
  /** Подпись из другого поля формы (например `cfg_unit` для цели числа). */
  suffixFromField?: string;
  /**
   * Короткая подсказка рядом с полем, пока значение пустое (единица / что вводить), вместе с `variant="inline"`.
   * Если не задано, для полей с `suffix` может подставляться обрезанный суффикс.
   */
  suffixHint?: string;
};

export type CfgSectionSpec = {
  /** Совпадает с id пункта в настройках / sections-config */
  sectionId: string;
  table: string;
  title: string;
  description: string;
  /**
   * Короткие советы над списком (как в legacy-подсказках к справочнику).
   * Не дублируйте длинные тексты из `description` — там общий смысл, здесь практика.
   */
  listTips?: string[];
  /**
   * Поля, скрытые в форме редактирования (JSON config, служебные флаги).
   * При сохранении подставляются из текущей строки БД или из `createExtra`.
   */
  hideFormKeys?: readonly string[];
  filter?: Record<string, string | number>;
  fields: CfgFieldDef[];
  rowTitleKeys?: string[];
  sortBy?: 'level' | 'title' | 'name' | 'none';
  createExtra?: Record<string, unknown>;
};
