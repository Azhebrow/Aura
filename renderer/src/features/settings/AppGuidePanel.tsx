import { cn } from '@/lib/utils';
import {
  BarChart3,
  BookHeart,
  BookOpen,
  CheckSquare,
  Flame,
  Ghost,
  Hash,
  Moon,
  Music2,
  PiggyBank,
  Salad,
  Sparkles,
  Star,
  Sun,
  Timer,
  Trophy,
} from 'lucide-react';

/* ─── atoms ──────────────────────────────────────────────────────────────────── */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50 mb-4 mt-10 first:mt-0">
      {children}
    </h3>
  );
}

/* ─── feature card ────────────────────────────────────────────────────────────── */

type FeatureCardProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  items?: string[];
  tag?: string;
};

function FeatureCard({ icon: Icon, title, description, items, tag }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-border/20 bg-muted/8 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 border border-border/15">
          <Icon className="size-4 text-foreground/55" aria-hidden />
        </div>
        {tag && (
          <span className="text-[10px] font-medium text-muted-foreground/55 mt-1.5">{tag}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {items && items.length > 0 && (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/80">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/35" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── workflow step ───────────────────────────────────────────────────────────── */

function WorkflowStep({ icon: Icon, time, title, description, last = false }: {
  icon: React.ElementType;
  time: string;
  title: string;
  description: string;
  last?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className="flex size-9 items-center justify-center rounded-full bg-muted/40 border border-border/25">
          <Icon className="size-4 text-foreground/60" aria-hidden />
        </div>
        {!last && <div className="w-px flex-1 bg-border/25 my-2 min-h-5" />}
      </div>
      <div className={cn('min-w-0', last ? 'pb-0' : 'pb-5')}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{title}</span>
          <span className="text-[11px] text-muted-foreground/50">{time}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/* ─── task type row ───────────────────────────────────────────────────────────── */

function TaskTypeRow({ icon: Icon, name, hint, description, example }: {
  icon: React.ElementType;
  name: string;
  hint: string;
  description: string;
  example: string;
}) {
  return (
    <div className="flex gap-3.5 py-4 border-b border-border/15 last:border-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/40 border border-border/15 mt-0.5">
        <Icon className="size-4 text-foreground/55" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className="text-[10px] text-muted-foreground/50 border border-border/25 rounded-full px-2 py-px">{hint}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground mb-1.5">{description}</p>
        <p className="text-[11px] text-muted-foreground/55 italic">{example}</p>
      </div>
    </div>
  );
}

/* ─── quick start step ────────────────────────────────────────────────────────── */

function StartStep({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex gap-3.5 py-3 border-b border-border/12 last:border-0">
      <span className="font-mono text-xs font-semibold text-muted-foreground/35 w-5 shrink-0 mt-px">{n}</span>
      <div>
        <p className="text-xs font-semibold text-foreground mb-0.5">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

/* ─── main ────────────────────────────────────────────────────────────────────── */

export function AppGuidePanel() {
  return (
    <div className="max-w-2xl space-y-0 pb-4">

      {/* ── Hero ── */}
      <div className="rounded-xl border border-border/25 bg-muted/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/25">
            <Sparkles className="size-5 text-foreground/60" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-lg font-bold text-foreground tracking-tight">AURA</h2>
              <Chip>Только на компьютере</Chip>
            </div>
            <p className="text-xs text-muted-foreground">Геймифицированная панель управления жизнью</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground mb-5">
          Один инструмент вместо десяти приложений. Открыл утром — вписал ритуалы, задачи, дневник. Закрыл вечером — сверил финансы, посмотрел итог дня. Всё в одном окне, без телефона.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: CheckSquare, label: 'Задачи' },
            { icon: BookHeart,   label: 'Дневник' },
            { icon: PiggyBank,   label: 'Финансы' },
            { icon: BarChart3,   label: 'Статистика' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border border-border/20 bg-background/40 px-3 py-2">
              <Icon className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Дневной ритм ── */}
      <SectionTitle>Дневной ритм</SectionTitle>
      <div className="rounded-xl border border-border/25 bg-muted/8 px-5 py-5">
        <WorkflowStep
          icon={Sun}
          time="утро"
          title="Запуск дня"
          description="Отмечаешь утренние ритуалы, пишешь запись в дневник, выставляешь настроение, намечаешь задачи на день."
        />
        <WorkflowStep
          icon={Timer}
          time="день"
          title="Работа и задачи"
          description="Запускаешь таймеры фокуса, отмечаешь чекбоксы, вводишь числовые показатели, логируешь приёмы пищи."
        />
        <WorkflowStep
          icon={Moon}
          time="вечер"
          title="Итоги"
          description="Отмечаешь вечерние ритуалы, проверяешь финансы за день, смотришь итоговый % прогресса и очки."
          last
        />
      </div>

      {/* ── Система очков ── */}
      <SectionTitle>Система очков</SectionTitle>
      <div className="rounded-xl border border-border/25 bg-muted/8 p-5 space-y-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Каждый день получает оценку от 0% до 100% на основе выполненных задач и ритуалов. Из процента вычисляются ежедневные очки.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { label: 'Отличный день',  range: '+50 — +100', sub: '75–100% прогресса' },
            { label: 'Нейтральный',    range: '−50 — +50',  sub: '40–75% прогресса' },
            { label: 'Упущенный день', range: '−100 — −50', sub: 'менее 40%' },
          ].map(({ label, range, sub }) => (
            <div key={label} className="rounded-lg border border-border/20 bg-muted/20 px-4 py-3">
              <p className="text-xs font-semibold text-foreground mb-0.5">{label}</p>
              <p className="font-mono text-sm font-bold text-foreground/70 mb-1">{range}</p>
              <p className="text-[11px] text-muted-foreground/60">{sub}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border/20 bg-muted/25 px-4 py-3">
          <Trophy className="size-4 shrink-0 text-muted-foreground/50" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Очки суммируются в недельную и месячную статистику — можно отслеживать долгосрочные паттерны.
          </p>
        </div>
      </div>

      {/* ── Функции ── */}
      <SectionTitle>Функции</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FeatureCard
          icon={Flame}
          title="Ритуалы"
          tag="Ежедневно"
          description="Утренние и вечерние ритуалы — повторяющиеся действия для формирования привычек."
          items={['Утренние: зарядка, медитация, витамины', 'Вечерние: планирование, чтение', 'Обеты — долгосрочные практики с серией']}
        />
        <FeatureCard
          icon={CheckSquare}
          title="Задачи"
          tag="4 категории"
          description="4 настраиваемые категории задач с разными типами: чекбокс, число, таймер, питание, список."
          items={['Переименуй категории под себя', 'Каждый тип задачи считается отдельно', 'Прогресс агрегируется в дневной %']}
        />
        <FeatureCard
          icon={BookHeart}
          title="Дневник и настроение"
          tag="Каждый день"
          description="Текстовые записи с категориями и оценкой настроения от 1 до 5."
          items={['Кастомные эмодзи для настроений', 'Категории и цитаты-подсказки', 'Хранится локально']}
        />
        <FeatureCard
          icon={PiggyBank}
          title="Финансы"
          tag="Доходы / Расходы"
          description="Несколько счетов, категории транзакций, баланс в реальном времени."
          items={['Карта, наличные, вклад — любые счета', 'Категории доходов и расходов', 'Итог дня в боковой панели']}
        />
        <FeatureCard
          icon={Salad}
          title="Питание"
          tag="КБЖУ"
          description="База продуктов, пресеты приёмов пищи, учёт калорий и БЖУ."
          items={['Собственная база продуктов', 'Пресеты для быстрого добавления', 'Цель по калориям в задачах']}
        />
        <FeatureCard
          icon={BarChart3}
          title="Статистика"
          tag="Графики"
          description="Визуальные графики прогресса по всем разделам за любой период."
          items={['Ежедневные очки и категории', 'История настроения', 'Финансовые тренды']}
        />
        <FeatureCard
          icon={Ghost}
          title="Досуг"
          tag="2 типа"
          description="Наполняющий досуг (книги, прогулки) и эскапизм (сериалы, игры) — с учётом баланса."
        />
        <FeatureCard
          icon={Music2}
          title="Фоновая музыка"
          tag="Атмосфера"
          description="Встроенный плеер с тематическими плейлистами для работы и концентрации."
        />
      </div>

      {/* ── Типы задач ── */}
      <SectionTitle>Типы задач</SectionTitle>
      <div className="rounded-xl border border-border/25 bg-muted/8 px-5 divide-y-0">
        <TaskTypeRow
          icon={CheckSquare}
          name="Чекбокс"
          hint="нажать — выполнено"
          description="Самый простой тип. Задача либо выполнена, либо нет."
          example="Сделать зарядку · Выпить витамины · Прочитать главу"
        />
        <TaskTypeRow
          icon={Hash}
          name="Число"
          hint="ввести значение"
          description="Прогресс считается относительно целевого значения из настроек."
          example="10 000 шагов · 8 стаканов воды · 60 минут тренировки"
        />
        <TaskTypeRow
          icon={Timer}
          name="Таймер"
          hint="только в категории Фокус"
          description="Запускаешь таймер — он считает время. Все сессии за день суммируются."
          example="90 мин deep work · 45 мин программирование"
        />
        <TaskTypeRow
          icon={Salad}
          name="Питание"
          hint="только в категории Здоровье"
          description="Прогресс берётся автоматически из журнала питания. Только одна такая задача."
          example="Цель 2000 ккал — заполняется из раздела питания"
        />
        <TaskTypeRow
          icon={Star}
          name="Список"
          hint="несколько подпунктов"
          description="Задача с несколькими чекбоксами внутри. Прогресс — доля выполненных."
          example="Уборка: кухня, ванная, комната, пылесос"
        />
      </div>

      {/* ── Быстрый старт ── */}
      <SectionTitle>Быстрый старт</SectionTitle>
      <div className="rounded-xl border border-border/25 bg-muted/8 px-5 py-2">
        <StartStep n="01" title="Настрой оформление" desc="Тема, цвет, шрифт и валюта — раздел «Оформление и данные»." />
        <StartStep n="02" title="Добавь ритуалы" desc="3–5 утренних и 2–3 вечерних действия в разделах ритуалов." />
        <StartStep n="03" title="Настрой задачи" desc="В каждой из 4 категорий добавь свои задачи. Переименуй категории." />
        <StartStep n="04" title="Создай счета" desc="Карта, наличные — добавь с текущим балансом в разделе «Счета»." />
        <StartStep n="05" title="Веди дневник" desc="Утром — планы. Вечером — итог дня и оценка настроения." />
        <StartStep n="06" title="Смотри статистику" desc="Через неделю загляни в Статистику — увидишь свои паттерны." />
      </div>

      {/* ── Footer ── */}
      <div className="flex items-start gap-3 pt-6 border-t border-border/20 mt-8">
        <BookOpen className="size-4 shrink-0 text-muted-foreground/40 mt-0.5" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground/60">
          AURA — инструмент для тех, кто хочет видеть всю свою жизнь в одном месте без лишнего шума телефона. Настрой под себя один раз — и просто пользуйся каждый день.
        </p>
      </div>

    </div>
  );
}
