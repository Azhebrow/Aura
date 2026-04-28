# ListItem Component Documentation

`ListItem` — это универсальный компонент для отображения элементов списков с поддержкой различных режимов интерактивности. Используется единообразно по всему приложению для максимальной визуальной и функциональной консистентности.

## Ключевой принцип унификации

**Единая логика везде (кроме режима checkbox и diary):**

- Левая часть: иконка + название + amount + описание (ВСЕГДА видны)
- Граница border-l: видна ТОЛЬКО при hover (вместе с элементами управления)
- Правая часть: элементы управления (видны ТОЛЬКО при hover)

**Исключение 1 - Режим `checkbox`:**

- Граница border-l ВСЕГДА видна
- Чекбокс справа ВСЕГДА видим

**Исключение 2 - Режим `diary`:**

- Нет border-l вообще
- Все элементы справа ВСЕГДА видны

---

## Режимы Использования

### 1. `edit-delete` — Финансы, Питание, Таймер, Конфиг

**Структура:**

```
[ИКОНКА] [Название]
         [Amount]       ──────────────────
         [Описание]     | [🗑️ на hover]
```

**Логика:**

- Левая часть: иконка + название + amount + описание (ВСЕГДА видны)
- Граница border-l и кнопка delete: видны ТОЛЬКО при hover

**Обязательные Props:**

```typescript
<ListItem
  mode="edit-delete"
  title="Название"
  onDelete={() => { /* ... */ }}
/>
```

**Рекомендуемые Props:**

```typescript
<ListItem
  mode="edit-delete"
  icon="icon-name"           // Иконка слева
  iconTint="color"           // Цвет иконки
  title="Название"           // Основной текст
  amount="−500 ₽"           // Сумма/значение (вторая строка!) - НОВЫЙ PROP
  description="Доп.текст"   // Описание (третья строка)
  onDelete={() => remove()}  // Удаление
/>
```

**Примеры:**

**Финансы:**

```typescript
<ListItem
  mode="edit-delete"
  icon="wallet"
  iconTint="var(--primary)"
  title="Покупка продуктов"
  amount="−500 ₽"
  description="Пятница, 14:30"
  onDelete={() => removeTransaction()}
/>
```

**Питание:**

```typescript
<ListItem
  mode="edit-delete"
  icon="apple"
  title="Яблоки"
  amount="2Б 0Ж 25У 95ккал"
  onDelete={() => deleteNutrition()}
/>
```

**Таймер (часы):**

```typescript
<ListItem
  mode="edit-delete"
  icon="task"
  title="Название задачи"
  amount="1.5ч / 2ч"
  onDelete={() => removeTask()}
/>
```

**Ключевая особенность:** Amount отображается второй строкой, справа при hover появляется граница и кнопка удаления.

---

### 2. `checkbox` — Ритуалы, Видимость Секций

**Структура:**

```
[ИКОНКА] [Название] [Описание] | [☑️]
```

**Логика:**

- Левая часть: иконка + название + описание (ВСЕГДА видны)
- Граница border-l: ВСЕГДА видна (исключение!)
- Чекбокс справа: ВСЕГДА видим

**Рекомендуемые Props:**

```typescript
<ListItem
  mode="checkbox"
  icon="sunrise"
  title="Утренний ритуал"
  description="Делать каждое утро"
  checked={isChecked}
  isDone={completed}
  onCheckedChange={(checked) => updateRitual(id, checked)}
/>
```

**Ключевая особенность:** Чекбокс и граница никогда не исчезают, всегда видны.

---

### 3. `checkbox-delete` — Дневные Планы

**Структура:**

```
[☑️] [Название] [Описание] ──────────────────
              | [↑] [↓] [🗑️ на hover]
```

**Логика:**

- Чекбокс СЛЕВА: ВСЕГДА видим
- Левая часть: название + описание (ВСЕГДА видны)
- Граница border-l и стрелки/delete: видны ТОЛЬКО при hover

**Рекомендуемые Props:**

```typescript
<ListItem
  mode="checkbox-delete"
  title="Прочитать книгу"
  description="Глава 5-7"
  checked={done}
  isDone={done}
  onCheckedChange={(checked) => updatePlan(id, checked)}
  onMoveUp={idx > 0 ? () => move(idx, idx - 1) : undefined}
  onMoveDown={idx < plans.length - 1 ? () => move(idx, idx + 1) : undefined}
  onDelete={() => removePlan(id)}
/>
```

**Ключевая особенность:** Чекбокс слева всегда видим, стрелки и delete видны только при hover вместе с границей.

---

### 4. `active` — (Устаревший, используйте `diary`)

**Заменён режимом `diary` для специальных структур.**

---

### 5. `diary` — Записи Дневника

**Структура:**

```
[Дата] [Текст preview]     ──────────
                       [ИКОНКА]
                       [●●●●●]
```

**Логика:**

- Левая часть: дата + текст (ВСЕГДА видны)
- Правая часть: иконка категории + progress dots (ВСЕГДА видны, NO hover)
- Нет border-l

**Рекомендуемые Props:**

```typescript
<ListItem
  mode="diary"
  title={dateString}
  description={diaryTextPreview}
  categoryIcon={cat?.icon}
  moodLevel={mood?.level ?? 0}
  moodLevelsTotal={moods.length}
  onActivate={() => selectEntry(id)}
/>
```

**Ключевая особенность:** Специальная структура с большой иконкой и progress dots, без border-l, без hover эффектов на структуру.

---

## Общие Props


| Prop              | Тип                          | Описание                                  |
| ----------------- | ---------------------------- | ----------------------------------------- |
| `mode`            | `'edit-delete'               | 'checkbox'                                |
| `title`           | `string                      | ReactNode`                                |
| `amount`          | `string                      | ReactNode`                                |
| `description`     | `string                      | ReactNode`                                |
| `icon`            | `string                      | null`                                     |
| `iconTint`        | `string`                     | Цвет иконки                               |
| `trailing`        | `ReactNode`                  | Содержимое справа (для checkbox и active) |
| `isDone`          | `boolean`                    | Зачеркивание текста                       |
| `className`       | `string`                     | Доп. CSS классы                           |
| `onEdit`          | `() => void`                 | Редактирование (edit-delete)              |
| `onDelete`        | `() => void`                 | Удаление (edit-delete, checkbox-delete)   |
| `onActivate`      | `() => void`                 | Активация (active, diary)                 |
| `checked`         | `boolean`                    | Состояние чекбокса                        |
| `onCheckedChange` | `(checked: boolean) => void` | Изменение чекбокса                        |
| `onMoveUp`        | `() => void`                 | Переместить вверх (checkbox-delete)       |
| `onMoveDown`      | `() => void`                 | Переместить вниз (checkbox-delete)        |
| `categoryIcon`    | `string                      | null`                                     |
| `moodLevel`       | `number`                     | Уровень настроения (diary)                |
| `moodLevelsTotal` | `number`                     | Всего уровней (diary)                     |


---

## Визуальная Унификация

**ВСЕГДА одинаковое:**

- Граница и скругление: `rounded border border-border/40`
- Базовый фон: `bg-muted/8`
- Hover фон: `hover:bg-muted/12`
- Padding левой части: `px-3 py-2.5`
- Размер текста: title `text-sm font-semibold`, description `text-xs`
- Transition: `duration-200`

**РАЗЛИЧАЕТСЯ по режиму:**

- Видимость border-l (checkbox всегда, остальные на hover)
- Видимость элементов справа (varies)
- Структура левой части (amount для edit-delete)

---

## Примеры комбинированного использования

### Финансы (edit-delete)

```typescript
{transactions.map(t => (
  <ListItem
    key={t.id}
    mode="edit-delete"
    icon={t.icon}
    iconTint={t.color}
    title={t.name}
    amount={`${t.sign}${formatAmount(t.amount)}`}
    description={t.date}
    onDelete={() => deleteTransaction(t.id)}
  />
))}
```

### Планы (checkbox-delete)

```typescript
{plans.map((p, idx) => (
  <ListItem
    key={p.id}
    mode="checkbox-delete"
    title={p.text}
    checked={p.done}
    isDone={p.done}
    onCheckedChange={(checked) => updatePlan(p.id, checked)}
    onMoveUp={idx > 0 ? () => move(idx, idx - 1) : undefined}
    onMoveDown={idx < plans.length - 1 ? () => move(idx, idx + 1) : undefined}
    onDelete={() => removePlan(p.id)}
  />
))}
```

### Ритуалы (checkbox)

```typescript
{rituals.map(r => (
  <ListItem
    key={r.id}
    mode="checkbox"
    icon={r.icon}
    title={r.name}
    checked={r.completed}
    isDone={r.completed}
    onCheckedChange={(checked) => updateRitual(r.id, checked)}
  />
))}
```

---

## Рекомендации для разработчиков

1. **Amount вторая строка** — используйте для сумм, значений, метрик в edit-delete режиме
2. **Description третья строка** — для контекстной информации (даты, описания)
3. **Hover логика унифицирована** — не добавляйте custom hover эффекты
4. **Checkbox режим особый** — граница и чекбокс ВСЕГДА видны
5. **Diary режим особый** — нет border-l, иконка всегда видна
6. **Conditioning** — передавайте `undefined` для `onMoveUp`/`onMoveDown` если невозможно действие

---

## Интеграционные заметки

- Компонент: `/src/components/ui/list-item.tsx`
- ProgressDots: `/src/components/ui/progress-dots.tsx`
- Импорт: `import { ListItem } from '@/components/ui/list-item'`

