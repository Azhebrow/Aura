# Система анимации слайда при переключении вкладок/режимов

## Описание

Эта система обеспечивает плавную анимацию слайдования контента влево/вправо при переключении между вкладками, режимами или другими компонентами с переключением.

**Направление анимации:**
- Переключение на вкладку **справа** → контент скользит **вправо** (новый контент приходит справа)
- Переключение на вкладку **слева** → контент скользит **влево** (новый контент приходит слева)

## Компоненты и Hooks

### 1. `useTabSlideAnimation(currentIndex: number, options?)`
**Для компонентов, которые используют индексы вкладок**

Отслеживает направление переключения на основе числового индекса.

```typescript
import { useTabSlideAnimation } from '@/shared/hooks/use-tab-slide-animation';

const direction = useTabSlideAnimation(currentIndex);
// direction: 'left' | 'right' | null
```

**Пример использования с Radix UI Tabs:**
```typescript
const tabsList = childArray.find(child => React.isValidElement(child) && child.type === TabsList);
const currentIndex = findIndexByValue(value, tabsList);
const direction = useTabSlideAnimation(currentIndex);

// Применить класс к TabsContent
<TabsContent className={cn(
  'flex-1 text-sm outline-none',
  direction === 'right' ? 'aura-tabs-slide-enter-right' : 
  direction === 'left' ? 'aura-tabs-slide-enter-left' : ''
)} />
```

### 2. `useRadioGroupSlideAnimation<T>(currentValue: T, optionValues: T[], options?)`
**Для компонентов, которые используют строковые значения или enum**

Отслеживает направление переключения на основе строкового значения, преобразуя его в индекс.

```typescript
import { useRadioGroupSlideAnimation, getSlideAnimationClasses } from '@/shared/hooks/use-radio-group-slide-animation';

const slideDirection = useRadioGroupSlideAnimation(currentValue, ['nutrition', 'entries']);
// slideDirection: 'left' | 'right' | null

// Применить классы автоматически
const className = getSlideAnimationClasses(isActive, slideDirection);
```

**Пример использования в DiaryEditorPage:**
```typescript
const [rightTab, setRightTab] = useState<RightTab>('nutrition');
const slideDirection = useRadioGroupSlideAnimation(rightTab, ['nutrition', 'entries']);

// ...

<div className={cn(MEGA_PANEL_BODY_CN, getSlideAnimationClasses(true, slideDirection))}>
  {/* содержимое */}
</div>
```

## CSS Классы и Анимации

### Доступные классы
- `aura-tabs-slide-enter-left` - контент входит слева
- `aura-tabs-slide-enter-right` - контент входит справа
- `aura-tabs-slide-exit-left` - контент выходит слева
- `aura-tabs-slide-exit-right` - контент выходит справа

Все анимации:
- Длительность: 300ms (настраивается через `var(--aura-motion-ease)`)
- Смещение: 20px
- Эффект: fade + slide
- Автоматически отключаются при `prefers-reduced-motion`

## Как использовать

### Вариант 1: Простое использование с getSlideAnimationClasses()

```typescript
import { useRadioGroupSlideAnimation, getSlideAnimationClasses } from '@/shared/hooks/use-radio-group-slide-animation';

export function MyComponent() {
  const [mode, setMode] = useState('view1');
  const slideDirection = useRadioGroupSlideAnimation(mode, ['view1', 'view2', 'view3']);

  return (
    <div>
      <Switcher value={mode} onChange={setMode} options={['view1', 'view2', 'view3']} />
      
      {/* Применить анимацию к контенту */}
      <div className={getSlideAnimationClasses(true, slideDirection)}>
        {mode === 'view1' && <View1 />}
        {mode === 'view2' && <View2 />}
        {mode === 'view3' && <View3 />}
      </div>
    </div>
  );
}
```

### Вариант 2: Ручное применение классов

```typescript
const direction = useRadioGroupSlideAnimation(currentValue, values);

const containerClass = cn(
  'my-container',
  direction === 'right' ? 'aura-tabs-slide-enter-right' : '',
  direction === 'left' ? 'aura-tabs-slide-enter-left' : '',
);

<div className={containerClass}>{content}</div>
```

### Вариант 3: Использование MobilePageShell (для мобильных секций)

```typescript
import { MobilePageShell } from '@/shared/ui/mobile';

<MobilePageShell
  sections={[
    { id: 'section1', label: 'Раздел 1', Icon: List, content: <Section1 /> },
    { id: 'section2', label: 'Раздел 2', Icon: Grid, content: <Section2 /> },
  ]}
  value={selectedSection}
  onChange={setSelectedSection}
/>
```

## Примеры в коде

### DiaryEditorPage
Анимация при переключении между Nutrition и Entries:
- Используется `useRadioGroupSlideAnimation(rightTab, ['nutrition', 'entries'])`
- Применяется к панели с контентом питания/записей

### Tabs компонент (Radix UI)
Встроенная поддержка через Context:
- Автоматически отслеживает индекс активной вкладки
- Применяет анимацию к `TabsContent`
- Работает без дополнительного кода

## Советы и лучшие практики

1. **Всегда передавайте options в правильном порядке**: порядок в массиве определяет направление анимации
   ```typescript
   // ✅ Правильно: первый элемент слева, второй справа
   useRadioGroupSlideAnimation(value, ['left', 'right']);
   
   // ❌ Неправильно: перепутан порядок
   useRadioGroupSlideAnimation(value, ['right', 'left']);
   ```

2. **Применяйте анимацию к контейнеру с контентом, а не к отдельным элементам**
   ```typescript
   // ✅ Правильно: анимация контейнера
   <div className={getSlideAnimationClasses(true, direction)}>
     {content}
   </div>
   
   // ❌ Неправильно: анимация к переключателю
   <button className={getSlideAnimationClasses(true, direction)}>
     Переключить
   </button>
   ```

3. **Используйте `isActive` параметр правильно**
   ```typescript
   // Если контент всегда видим:
   const animClass = getSlideAnimationClasses(true, direction);
   
   // Если контент условный (видим только если активен):
   const isActive = currentMode === mode;
   const animClass = getSlideAnimationClasses(isActive, direction);
   ```

## Настройка анимации

Измените параметры в CSS переменных:
```css
/* Скорость */
--aura-motion-duration-base: 300ms;

/* Эasing функция */
--aura-motion-ease: cubic-bezier(0.4, 0, 0.2, 1);
```

Или в самих keyframes в `globals.css`:
```css
@keyframes slide-in-from-right {
  0% {
    opacity: 0;
    transform: translateX(20px); /* Измените смещение */
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
```

## Отключение для конкретного компонента

```typescript
// Просто не применяйте классы анимации
<div>
  {/* Контент без анимации */}
</div>
```

## Доступность

Анимация автоматически отключается для пользователей с `prefers-reduced-motion: reduce`:
```css
@media (prefers-reduced-motion: reduce) {
  .aura-tabs-slide-enter-left,
  .aura-tabs-slide-enter-right,
  /* ... */
  {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```
