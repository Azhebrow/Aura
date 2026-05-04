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
  Target,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';

/* ─── primitive building blocks ─────────────────────────────────────────────── */

function Badge({ children, color = 'muted' }: { children: React.ReactNode; color?: 'muted' | 'violet' | 'amber' | 'blue' | 'green' | 'rose' }) {
  const cls = {
    muted:  'bg-muted/40 text-muted-foreground border-border/30',
    violet: 'bg-violet-500/10 text-violet-700 border-violet-400/25',
    amber:  'bg-amber-500/10 text-amber-700 border-amber-400/25',
    blue:   'bg-blue-500/10 text-blue-700 border-blue-400/25',
    green:  'bg-green-500/10 text-green-700 border-green-400/25',
    rose:   'bg-rose-500/10 text-rose-700 border-rose-400/25',
  }[color];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cls)}>
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 mb-4">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="border-t border-border/20 my-8" />;
}

/* ─── feature card ───────────────────────────────────────────────────────────── */

type FeatureCardProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  items?: string[];
  badge?: string;
  badgeColor?: 'muted' | 'violet' | 'amber' | 'blue' | 'green' | 'rose';
  accent?: string;
};

function FeatureCard({ icon: Icon, title, description, items, badge, badgeColor = 'violet', accent = 'text-foreground/70' }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-border/25 bg-card/60 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/40 border border-border/20', accent)}>
          <Icon className="size-4.5" aria-hidden />
        </div>
        {badge && <Badge color={badgeColor}>{badge}</Badge>}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {items && items.length > 0 && (
        <ul className="space-y-1 mt-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="mt-0.5 size-1 shrink-0 rounded-full bg-muted-foreground/40 mt-1.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── workflow step ──────────────────────────────────────────────────────────── */

function WorkflowStep({ step, icon: Icon, time, title, description, color }: {
  step: number;
  icon: React.ElementType;
  time: string;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold', color)}>
          <Icon className="size-4" aria-hidden />
        </div>
        {step < 3 && <div className="w-px flex-1 bg-border/30 mt-2 mb-1 min-h-6" />}
      </div>
      <div className="pb-6 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-muted-foreground/60">{time}</span>
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/* ─── points tier ────────────────────────────────────────────────────────────── */

function PointTier({ label, range, description, color }: { label: string; range: string; description: string; color: string }) {
  return (
    <div className={cn('rounded-lg border p-3.5', color)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-foreground">{label}</span>
        <span className="font-mono text-xs font-semibold text-muted-foreground">{range}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────────────── */

export function AppGuidePanel() {
  return (
    <div className="space-y-0 max-w-3xl">

      {/* ── Hero ── */}
      <div className="rounded-xl border border-border/30 bg-gradient-to-br from-muted/30 via-muted/15 to-transparent p-7 mb-6">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-foreground/8 border border-border/30">
            <Sparkles className="size-7 text-foreground/70" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-2">
              <h2 className="text-xl font-bold text-foreground tracking-tight">AURA</h2>
              <Badge color="violet">Desktop only</Badge>
              <Badge color="amber">Gamified</Badge>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-lg">
              Геймифицированная панель управления жизнью. Открыл утром — вписал планы и ритуалы. Закрыл вечером — всё сверено. Один инструмент вместо десяти приложений.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: CheckSquare, label: 'Задачи и цели' },
            { icon: BookHeart,   label: 'Дневник' },
            { icon: PiggyBank,   label: 'Финансы' },
            { icon: BarChart3,   label: 'Статистика' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-lg bg-background/50 border border-border/25 px-3 py-2.5">
              <Icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
              <span className="text-xs font-medium text-foreground/80">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Концепция ── */}
      <SectionLabel>Основная идея</SectionLabel>
      <div className="rounded-xl border border-border/25 bg-card/40 p-6 mb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-violet-500/6 border border-violet-400/20 p-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 mb-3">
              <Target className="size-4 text-violet-600" aria-hidden />
            </div>
            <p className="text-xs font-semibold text-foreground mb-1.5">Всё в одном месте</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">Задачи, дневник, питание, финансы, ритуалы, досуг — всё в одном окне без переключения между приложениями.</p>
          </div>
          <div className="rounded-lg bg-amber-500/6 border border-amber-400/20 p-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 mb-3">
              <Trophy className="size-4 text-amber-600" aria-hidden />
            </div>
            <p className="text-xs font-semibold text-foreground mb-1.5">Геймификация</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">Каждое выполненное действие приносит очки. Ежедневный прогресс отображается в процентах. Цель — 100% к вечеру.</p>
          </div>
          <div className="rounded-lg bg-blue-500/6 border border-blue-400/20 p-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 mb-3">
              <Zap className="size-4 text-blue-600" aria-hidden />
            </div>
            <p className="text-xs font-semibold text-foreground mb-1.5">Только компьютер</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">Приложение только для компьютера — намеренно. Телефон отвлекает, а AURA — инструмент для осознанной работы с собой.</p>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Дневной ритм ── */}
      <SectionLabel>Дневной ритм</SectionLabel>
      <div className="rounded-xl border border-border/25 bg-card/40 p-6 mb-6">
        <WorkflowStep
          step={1}
          icon={Sun}
          time="Утро"
          title="Запуск дня"
          description="Открываешь AURA, отмечаешь утренние ритуалы (душ, зарядка, медитация), вписываешь запись в дневник, выставляешь настроение, планируешь задачи на день."
          color="border-amber-400/60 bg-amber-400/10 text-amber-600"
        />
        <WorkflowStep
          step={2}
          icon={Timer}
          time="День"
          title="Работа и задачи"
          description="Запускаешь таймеры фокуса, отмечаешь чекбоксы выполненных задач, вносишь числовые показатели (тренировка, шаги, вода), логируешь приёмы пищи."
          color="border-blue-400/60 bg-blue-400/10 text-blue-600"
        />
        <WorkflowStep
          step={3}
          icon={Moon}
          time="Вечер"
          title="Итоги дня"
          description="Отмечаешь вечерние ритуалы, проверяешь финансы (доходы и расходы за день), смотришь итоговый % прогресса и очки. При желании — статистика за неделю/месяц."
          color="border-violet-400/60 bg-violet-400/10 text-violet-600"
        />
      </div>

      <Divider />

      {/* ── Система очков ── */}
      <SectionLabel>Система очков</SectionLabel>
      <div className="rounded-xl border border-border/25 bg-card/40 p-6 mb-6 space-y-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Каждый день получает оценку от 0% до 100% на основе выполненных задач, ритуалов и других активностей. Из процента считаются ежедневные очки — они суммируются в недельную и месячную статистику.
        </p>
        <div className="rounded-lg bg-muted/25 border border-border/20 px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-3">Формула очков</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="rounded-md bg-background border border-border/30 px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">Прогресс</p>
              <p className="font-mono text-sm font-bold text-foreground">75%</p>
            </div>
            <span className="text-lg text-muted-foreground/50">→</span>
            <div className="rounded-md bg-background border border-border/30 px-3 py-2 text-center">
              <p className="text-[10px] text-muted-foreground/60 mb-0.5">Очки дня</p>
              <p className="font-mono text-sm font-bold text-amber-600">+50</p>
            </div>
            <div className="text-xs text-muted-foreground/60 max-w-[200px]">
              При 100% — +100 очков. При 50% — 0. Ниже 50% — отрицательные.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <PointTier label="Отличный день" range="+50 — +100" description="75–100% прогресса. Большинство задач и ритуалов выполнено." color="border-green-400/25 bg-green-500/5" />
          <PointTier label="Нейтральный" range="-50 — +50" description="40–75% прогресса. Частичное выполнение." color="border-amber-400/25 bg-amber-500/5" />
          <PointTier label="Упущенный" range="-100 — -50" description="Менее 40%. День прошёл без структуры." color="border-rose-400/25 bg-rose-500/5" />
        </div>
      </div>

      <Divider />

      {/* ── Функции ── */}
      <SectionLabel>Функции по разделам</SectionLabel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
        <FeatureCard
          icon={Flame}
          title="Ритуалы"
          badge="Ежедневно"
          badgeColor="amber"
          accent="text-amber-600"
          description="Утренние и вечерние ритуалы — повторяющиеся действия, которые формируют привычки. Отмечаются каждый день."
          items={[
            'Утренние: зарядка, душ, медитация, витамины',
            'Вечерние: планирование, чтение, прогулка',
            'Обеты — долгосрочные практики с отслеживанием серии',
          ]}
        />
        <FeatureCard
          icon={CheckSquare}
          title="Задачи"
          badge="4 категории"
          badgeColor="violet"
          accent="text-violet-600"
          description="Задачи разбиты на 4 настраиваемые категории. Каждая категория имеет свой набор доступных типов задач."
          items={[
            'Чекбокс — выполнено / не выполнено',
            'Число — ввести значение (шаги, км, повторения)',
            'Таймер — отслеживание времени в фокусе',
            'Питание — автоматически из журнала питания',
          ]}
        />
        <FeatureCard
          icon={BookHeart}
          title="Дневник и настроение"
          badge="Каждый день"
          badgeColor="rose"
          accent="text-rose-600"
          description="Текстовый дневник с категориями, тегами и оценкой настроения. Записи сохраняются локально."
          items={[
            'Свободный текст + форматированные записи',
            'Настроение от 1 до 5 с кастомными эмодзи',
            'Категории и цитаты-подсказки для записей',
          ]}
        />
        <FeatureCard
          icon={PiggyBank}
          title="Финансы"
          badge="Доходы / Расходы"
          badgeColor="green"
          accent="text-green-700"
          description="Учёт доходов и расходов по категориям, несколько счетов, баланс в реальном времени."
          items={[
            'Несколько счетов (карта, наличные, вклад)',
            'Категории доходов и расходов',
            'Общий баланс в боковой панели',
          ]}
        />
        <FeatureCard
          icon={Salad}
          title="Питание"
          badge="Калории"
          badgeColor="green"
          accent="text-green-600"
          description="База продуктов питания, готовые пресеты приёмов пищи, учёт калорий и БЖУ за день."
          items={[
            'Собственная база продуктов с КБЖУ',
            'Пресеты блюд — быстрое добавление',
            'Дневная цель калорий и отображение в статистике',
          ]}
        />
        <FeatureCard
          icon={BarChart3}
          title="Статистика"
          badge="Графики"
          badgeColor="blue"
          accent="text-blue-600"
          description="Визуальные графики прогресса по всем разделам за любой период — день, неделю, месяц."
          items={[
            'Ежедневные очки и прогресс по категориям',
            'История настроения и дневника',
            'Финансовые тренды и баланс',
          ]}
        />
        <FeatureCard
          icon={Ghost}
          title="Досуг"
          badge="2 типа"
          badgeColor="violet"
          accent="text-violet-500"
          description="Две категории досуга: наполняющий (книги, прогулки, творчество) и эскапизм (сериалы, игры). Отслеживание баланса."
          items={[
            'Наполнение — полезный отдых, который заряжает',
            'Эскапизм — расслабление, но в меру',
          ]}
        />
        <FeatureCard
          icon={Music2}
          title="Фоновая музыка"
          badge="Атмосфера"
          badgeColor="muted"
          accent="text-foreground/60"
          description="Встроенный плеер фоновой музыки для работы. Плейлисты с lo-fi, ambient, nature sounds."
          items={[
            'Несколько тематических плейлистов',
            'Регулировка громкости прямо в приложении',
          ]}
        />
      </div>

      <Divider />

      {/* ── Типы задач ── */}
      <SectionLabel>Типы задач подробно</SectionLabel>
      <div className="rounded-xl border border-border/25 bg-card/40 p-6 mb-6 space-y-3">
        {[
          {
            icon: CheckSquare,
            name: 'Чекбокс',
            hint: 'Нажать — выполнено',
            color: 'text-violet-600 bg-violet-500/10 border-violet-400/20',
            description: 'Самый простой тип. Задача либо выполнена, либо нет. Подходит для всего, что можно сделать за раз.',
            example: 'Сделать зарядку · Выпить витамины · Прочитать 10 страниц',
          },
          {
            icon: Hash,
            name: 'Число',
            hint: 'Ввести значение',
            color: 'text-blue-600 bg-blue-500/10 border-blue-400/20',
            description: 'Вводишь числовое значение. Прогресс считается относительно целевого значения, заданного в настройках.',
            example: '10 000 шагов · 8 стаканов воды · 60 минут тренировки',
          },
          {
            icon: Timer,
            name: 'Таймер',
            hint: 'Только в Фокусе',
            color: 'text-amber-600 bg-amber-500/10 border-amber-400/20',
            description: 'Запускаешь таймер, он считает время. Все сессии за день суммируются. Доступен только в категории «Фокус».',
            example: '90 мин deep work · 45 мин программирование',
          },
          {
            icon: Salad,
            name: 'Питание',
            hint: 'Только в Здоровье',
            color: 'text-green-700 bg-green-500/10 border-green-400/20',
            description: 'Прогресс автоматически берётся из журнала питания. Только одна такая задача в категории «Здоровье».',
            example: 'Цель: 2000 ккал/день → заполняется из раздела питания',
          },
          {
            icon: Star,
            name: 'Список',
            hint: 'Несколько подпунктов',
            color: 'text-rose-600 bg-rose-500/10 border-rose-400/20',
            description: 'Задача с несколькими чекбоксами внутри. Прогресс — процент выполненных подпунктов.',
            example: 'Уборка: кухня, ванная, комната, пылесос',
          },
        ].map(({ icon: Icon, name, hint, color, description, example }) => (
          <div key={name} className="flex gap-4 rounded-lg border border-border/20 bg-muted/5 p-4">
            <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border mt-0.5', color)}>
              <Icon className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{name}</span>
                <span className="text-[11px] text-muted-foreground/60 bg-muted/40 px-2 py-0.5 rounded-full border border-border/20">{hint}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground mb-2">{description}</p>
              <p className="text-[11px] text-muted-foreground/70 italic">{example}</p>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      {/* ── Быстрый старт ── */}
      <SectionLabel>Быстрый старт</SectionLabel>
      <div className="rounded-xl border border-border/25 bg-card/40 p-6 mb-6">
        <div className="space-y-2">
          {[
            { n: '01', title: 'Настрой оформление', desc: 'Выбери тему, цвет, шрифт и валюту в разделе «Оформление и данные».' },
            { n: '02', title: 'Добавь ритуалы', desc: 'Перейди в «Утренние ритуалы» и «Вечерние ритуалы» — добавь 3–5 действий, которые хочешь выполнять каждый день.' },
            { n: '03', title: 'Настрой задачи', desc: 'В каждой из 4 категорий задач добавь то, что важно именно тебе. Переименуй категории под свой стиль жизни.' },
            { n: '04', title: 'Добавь счета', desc: 'В разделе «Счета» создай свои финансовые счета (карта, наличные). Укажи текущий баланс.' },
            { n: '05', title: 'Начни вести дневник', desc: 'Каждое утро — 2–3 предложения о планах или мыслях. Каждый вечер — итог дня и оценка настроения.' },
            { n: '06', title: 'Отслеживай прогресс', desc: 'Через неделю загляни в Статистику — увидишь свои паттерны, лучшие дни и области для роста.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-3.5 py-2.5 border-b border-border/10 last:border-0">
              <span className="font-mono text-[11px] font-bold text-muted-foreground/40 mt-0.5 w-5 shrink-0">{n}</span>
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">{title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer note ── */}
      <div className="flex items-start gap-3 rounded-xl border border-border/20 bg-muted/10 px-5 py-4">
        <BookOpen className="size-4 shrink-0 text-muted-foreground/50 mt-0.5" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground/70">
          AURA — инструмент для тех, кто хочет видеть всю свою жизнь в одном месте, но без лишнего шума телефона. Настрой под себя один раз — и просто пользуйся каждый день.
        </p>
      </div>

    </div>
  );
}
