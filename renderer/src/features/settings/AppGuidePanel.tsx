import { cn } from '@/lib/utils';
import {
  Activity,
  Ban,
  BarChart3,
  BookHeart,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Flame,
  Ghost,
  HandCoins,
  Hash,
  Moon,
  Music2,
  PiggyBank,
  Salad,
  Sparkles,
  Star,
  Sun,
  Timer,
  TrendingUp,
  Trophy,
  Wallet,
} from 'lucide-react';

type Color = 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'orange' | 'lime' | 'slate' | 'indigo';

const COLOR_MAP: Record<Color, { bg: string; text: string; border: string; dot: string }> = {
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-500',  border: 'border-violet-500/25',  dot: 'bg-violet-500'  },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-500',    border: 'border-blue-500/25',    dot: 'bg-blue-500'    },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/25', dot: 'bg-emerald-500' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-500',    border: 'border-rose-500/25',    dot: 'bg-rose-500'    },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-500',   border: 'border-amber-500/25',   dot: 'bg-amber-500'   },
  cyan:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-500',    border: 'border-cyan-500/25',    dot: 'bg-cyan-500'    },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-500',  border: 'border-orange-500/25',  dot: 'bg-orange-500'  },
  lime:    { bg: 'bg-lime-500/10',    text: 'text-lime-500',    border: 'border-lime-500/25',    dot: 'bg-lime-500'    },
  slate:   { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/25',   dot: 'bg-slate-400'   },
  indigo:  { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/25',  dot: 'bg-indigo-400'  },
};

/* ─── atoms ───────────────────────────────────────────────────────────────────── */

function Chip({ children, color }: { children: React.ReactNode; color?: Color }) {
  const c = color ? COLOR_MAP[color] : null;
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-caption font-medium',
      c ? `${c.bg} ${c.text} ${c.border}` : 'border-border/40 bg-muted/40 text-muted-foreground'
    )}>
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-caption font-bold uppercase tracking-[0.14em] text-muted-foreground/50 mb-4 mt-10">
      {children}
    </h3>
  );
}

function ColorIcon({ icon: Icon, color }: { icon: React.ElementType; color: Color }) {
  const c = COLOR_MAP[color];
  return (
    <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border', c.bg, c.border)}>
      <Icon className={cn('size-4', c.text)} aria-hidden />
    </div>
  );
}

/* ─── feature card ────────────────────────────────────────────────────────────── */

function FeatureCard({ icon: Icon, color, title, description, items, tag }: {
  icon: React.ElementType;
  color: Color;
  title: string;
  description: string;
  items?: string[];
  tag?: string;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className={cn('rounded-xl border bg-muted/8 p-4 flex flex-col gap-3', c.border)}>
      <div className="flex items-start justify-between gap-2">
        <ColorIcon icon={Icon} color={color} />
        {tag && <span className={cn('text-nano font-semibold mt-1.5 shrink-0', c.text)}>{tag}</span>}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {items && items.length > 0 && (
        <ul className="space-y-1 mt-auto pt-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground/80">
              <span className={cn('mt-1.5 size-1 shrink-0 rounded-full', c.dot)} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── workflow step ───────────────────────────────────────────────────────────── */

function WorkflowStep({ icon: Icon, color, time, title, description, last = false }: {
  icon: React.ElementType;
  color: Color;
  time: string;
  title: string;
  description: string;
  last?: boolean;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div className={cn('flex size-9 items-center justify-center rounded-full border', c.bg, c.border)}>
          <Icon className={cn('size-4', c.text)} aria-hidden />
        </div>
        {!last && <div className="w-px flex-1 bg-border/25 my-2 min-h-5" />}
      </div>
      <div className={cn('min-w-0', last ? 'pb-0' : 'pb-5')}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className={cn('text-caption font-medium', c.text)}>{time}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/* ─── task type row ───────────────────────────────────────────────────────────── */

function TaskTypeRow({ icon: Icon, color, name, hint, description, example }: {
  icon: React.ElementType;
  color: Color;
  name: string;
  hint: string;
  description: string;
  example: string;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className="flex gap-3.5 py-4 border-b border-border/15 last:border-0">
      <ColorIcon icon={Icon} color={color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{name}</span>
          <span className={cn('text-nano font-medium border rounded-full px-2 py-px', c.text, c.border, c.bg)}>{hint}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground mb-1.5">{description}</p>
        <p className={cn('text-caption italic', c.text, 'opacity-70')}>{example}</p>
      </div>
    </div>
  );
}

/* ─── rank row ───────────────────────────────────────────────────────────────── */

const RANKS: { n: number; name: string; pts: string; next: string; color: Color }[] = [
  { n: 1,  name: 'Никчёмный', pts: '0',      next: '500',    color: 'slate'   },
  { n: 2,  name: 'Лузер',     pts: '500',    next: '1 200',  color: 'slate'   },
  { n: 3,  name: 'Слабак',    pts: '1 200',  next: '2 100',  color: 'slate'   },
  { n: 4,  name: 'Работяга',  pts: '2 100',  next: '3 300',  color: 'blue'    },
  { n: 5,  name: 'Ученик',    pts: '3 300',  next: '4 800',  color: 'blue'    },
  { n: 6,  name: 'Воин',      pts: '4 800',  next: '6 600',  color: 'cyan'    },
  { n: 7,  name: 'Воля',      pts: '6 600',  next: '8 700',  color: 'emerald' },
  { n: 8,  name: 'Сила',      pts: '8 700',  next: '11 100', color: 'violet'  },
  { n: 9,  name: 'Легенда',   pts: '11 100', next: '13 800', color: 'orange'  },
  { n: 10, name: 'Атлант',    pts: '13 800', next: '—',      color: 'amber'   },
];

function RankRow({ n, name, pts, next, color }: typeof RANKS[number]) {
  const c = COLOR_MAP[color];
  const isMax = n === 10;
  return (
    <div className={cn('flex items-center gap-2 px-4 py-2.5 border-b border-border/10 last:border-0 min-w-0', isMax && 'bg-amber-500/5')}>
      <span className={cn('size-5 shrink-0 flex items-center justify-center rounded-md text-nano font-bold', c.bg, c.text)}>{n}</span>
      <span className={cn('text-xs font-semibold flex-1 min-w-0', isMax ? 'text-foreground' : 'text-foreground/80')}>{name}</span>
      <span className="font-mono text-caption text-muted-foreground/60 shrink-0 text-right">{pts}</span>
      <span className="font-mono text-caption text-muted-foreground/35 shrink-0 text-right hidden sm:block">
        {next === '—' ? <span className={cn('font-semibold', c.text)}>пик</span> : `→ ${next}`}
      </span>
    </div>
  );
}

/* ─── category card ────────────────────────────────────────────────────────────── */

const CATEGORIES: { icon: React.ElementType; color: Color; name: string; hint: string; desc: string; types: string }[] = [
  { icon: Sparkles, color: 'violet',  name: 'Рутина',  hint: 'ритуалы / чекбоксы', desc: 'Ежедневные практики и привычки. Поддерживает основу дня.',     types: 'Чекбокс · Число · Список · Ритуал' },
  { icon: Timer,    color: 'blue',    name: 'Фокус',   hint: 'только таймер',        desc: 'Учёт времени глубокой работы. Только тип «Таймер».',             types: 'Только Таймер' },
  { icon: Activity, color: 'emerald', name: 'Тонус',   hint: 'здоровье / питание',   desc: 'Физическое состояние: тренировки, питание, тело.',              types: 'Чекбокс · Число · Список · Питание' },
  { icon: Ban,      color: 'rose',    name: 'Детокс',  hint: 'только чекбокс',       desc: 'Ограничения и отказы. Победа — НЕ отметить галочку.',           types: 'Только Чекбокс' },
];

/* ─── main ────────────────────────────────────────────────────────────────────── */

export function AppGuidePanel() {
  return (
    <div className="space-y-0 pb-6 max-w-full">

      {/* ── Hero ── */}
      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 via-blue-500/5 to-transparent p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30">
            <Sparkles className="size-6 text-violet-400" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h2 className="text-xl font-bold text-foreground tracking-tight">AURA</h2>
              <Chip color="slate">Только на компьютере</Chip>
              <Chip color="violet">Геймификация</Chip>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xl">
              Один инструмент вместо десяти приложений. Задачи, дневник, финансы, питание, статистика — всё в одном окне. Открыл утром, закрыл вечером. Без телефона.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-4">
          {([
            { icon: CheckSquare, label: 'Задачи и ритуалы', color: 'violet' as Color },
            { icon: BookHeart,   label: 'Дневник',          color: 'rose'   as Color },
            { icon: PiggyBank,   label: 'Финансы',          color: 'emerald'as Color },
            { icon: BarChart3,   label: 'Статистика',       color: 'blue'   as Color },
          ]).map(({ icon: Icon, label, color }) => {
            const c = COLOR_MAP[color];
            return (
              <div key={label} className={cn('flex items-center gap-2 rounded-lg border px-2.5 sm:px-3 py-2 min-w-0', c.bg, c.border)}>
                <Icon className={cn('size-3 sm:size-3.5 shrink-0', c.text)} aria-hidden />
                <span className="text-xs text-muted-foreground truncate">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Концепция ── */}
      <SectionTitle>Основная идея</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([
          { color: 'violet' as Color, title: 'Всё в одном',   body: 'Задачи, дневник, питание, финансы, ритуалы, досуг — одно окно вместо десяти разных приложений.' },
          { color: 'amber'  as Color, title: 'Геймификация',  body: 'Каждое выполненное действие приносит % к дню. 100% = победа. Накопленные очки — твой ранг.' },
          { color: 'slate'  as Color, title: 'Без телефона',  body: 'Намеренно только для компьютера. Телефон отнимает внимание — AURA для осознанного времени за столом.' },
        ]).map(({ color, title, body }) => {
          const c = COLOR_MAP[color];
          return (
            <div key={title} className={cn('rounded-xl border px-4 sm:px-5 py-3 sm:py-4 min-w-0', c.bg, c.border)}>
              <div className={cn('text-xs font-bold uppercase tracking-wider mb-2', c.text)}>{title}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          );
        })}
      </div>

      {/* ── Дневной ритм ── */}
      <SectionTitle>Дневной ритм</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/25 bg-muted/8 px-4 sm:px-5 py-4 sm:py-5 min-w-0">
          <WorkflowStep icon={Sun}   color="amber"  time="утро"  title="Запуск дня"     description="Отмечаешь утренние ритуалы, пишешь запись в дневник, выставляешь настроение, намечаешь задачи." />
          <WorkflowStep icon={Timer} color="blue"   time="день"  title="Работа и задачи" description="Запускаешь таймеры фокуса, отмечаешь чекбоксы, вводишь числовые показатели, логируешь питание." />
          <WorkflowStep icon={Moon}  color="indigo" time="вечер" title="Итоги"           description="Вечерние ритуалы, финансы за день, итоговый % прогресса и заработанные очки." last />
        </div>
        <div className="rounded-xl border border-border/25 bg-muted/8 px-5 py-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Панель дня</p>
          <p className="text-xs leading-relaxed text-muted-foreground">В боковой панели всегда видна сводка выбранного дня. Можно настроить, какие метрики показывать.</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { icon: CalendarDays, label: 'Прогресс дня', color: 'violet'  as Color },
              { icon: TrendingUp,   label: 'Очки',         color: 'amber'   as Color },
              { icon: Timer,        label: 'Фокус',        color: 'blue'    as Color },
              { icon: Flame,        label: 'Ритуалы',      color: 'orange'  as Color },
              { icon: Salad,        label: 'Калории',      color: 'lime'    as Color },
              { icon: HandCoins,    label: 'Транзакции',   color: 'emerald' as Color },
              { icon: Wallet,       label: 'Баланс',       color: 'emerald' as Color },
              { icon: BookHeart,    label: 'Серия дней',   color: 'rose'    as Color },
            ]).map(({ icon: Icon, label, color }) => {
              const c = COLOR_MAP[color];
              return (
                <div key={label} className={cn('flex items-center gap-2 rounded-md border px-2.5 py-1.5', c.bg, c.border)}>
                  <Icon className={cn('size-3 shrink-0', c.text)} aria-hidden />
                  <span className="text-caption text-muted-foreground/80 truncate">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Система очков ── */}
      <SectionTitle>Система очков</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/25 bg-muted/8 p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Как считаются очки</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Каждый день получает оценку 0–100% на основе выполненных задач, ритуалов и активностей. Из процента вычисляется результат дня.</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              { pct: '100%', pts: '+100', color: 'emerald' as Color },
              { pct: '50%',  pts: '0',    color: 'slate'   as Color },
              { pct: '0%',   pts: '−100', color: 'rose'    as Color },
            ]).map(({ pct, pts, color }) => {
              const c = COLOR_MAP[color];
              return (
                <div key={pct} className={cn('rounded-lg border px-3 py-3 text-center', c.bg, c.border)}>
                  <p className={cn('font-mono text-base font-bold', c.text)}>{pts}</p>
                  <p className="text-caption text-muted-foreground/60 mt-0.5">{pct} дня</p>
                </div>
              );
            })}
          </div>
          <p className="text-caption text-muted-foreground/55 leading-relaxed">Формула: очки = (прогресс% × 2) − 100. Ниже 50% — уходишь в минус.</p>
        </div>
        <div className="rounded-xl border border-border/25 bg-muted/8 p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Градация дней</p>
          <div className="space-y-2">
            {([
              { label: 'Победный',    range: '+50 — +100', sub: '75–100% выполнено', color: 'emerald' as Color },
              { label: 'Нейтральный', range: '−50 — +50',  sub: '40–75% выполнено', color: 'amber'   as Color },
              { label: 'Упущенный',   range: '−100 — −50', sub: 'менее 40%',         color: 'rose'    as Color },
            ]).map(({ label, range, sub, color }) => {
              const c = COLOR_MAP[color];
              return (
                <div key={label} className={cn('flex items-center gap-3 rounded-lg border px-3.5 py-2.5 border-l-2', c.border, c.bg)}>
                  <div className="flex-1">
                    <p className={cn('text-xs font-bold', c.text)}>{label}</p>
                    <p className="text-caption text-muted-foreground/55">{sub}</p>
                  </div>
                  <span className={cn('font-mono text-xs font-bold shrink-0', c.text)}>{range}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Ранги ── */}
      <SectionTitle>Ранги</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/25 bg-muted/8 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/15 bg-muted/20">
            <div className="flex items-center gap-2 text-nano font-bold uppercase tracking-wider text-muted-foreground/40 min-w-0">
              <span className="w-5 shrink-0">#</span>
              <span className="flex-1 min-w-0">Ранг</span>
              <span className="shrink-0">От</span>
              <span className="shrink-0 hidden sm:block">До</span>
            </div>
          </div>
          {RANKS.slice(0, 5).map((r) => <RankRow key={r.n} {...r} />)}
        </div>
        <div className="rounded-xl border border-border/25 bg-muted/8 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/15 bg-muted/20">
            <div className="flex items-center gap-2 text-nano font-bold uppercase tracking-wider text-muted-foreground/40 min-w-0">
              <span className="w-5 shrink-0">#</span>
              <span className="flex-1 min-w-0">Ранг</span>
              <span className="shrink-0">От</span>
              <span className="shrink-0 hidden sm:block">До</span>
            </div>
          </div>
          {RANKS.slice(5).map((r) => <RankRow key={r.n} {...r} />)}
          <div className="px-4 py-3 border-t border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-2">
              <Trophy className="size-3.5 text-amber-500/70" aria-hidden />
              <p className="text-caption text-muted-foreground/60">«Атлант» — максимальный ранг. Нужно 13 800 очков.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Категории задач ── */}
      <SectionTitle>Категории задач</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map(({ icon: Icon, color, name, hint, desc, types }) => {
          const c = COLOR_MAP[color];
          return (
            <div key={name} className={cn('rounded-xl border p-4 space-y-3', c.bg, c.border)}>
              <div className="flex items-center gap-2.5">
                <div className={cn('flex size-8 items-center justify-center rounded-lg border shrink-0 bg-background/40', c.border)}>
                  <Icon className={cn('size-4', c.text)} aria-hidden />
                </div>
                <div>
                  <p className={cn('text-sm font-bold leading-tight', c.text)}>{name}</p>
                  <p className="text-nano text-muted-foreground/50">{hint}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
              <div className={cn('rounded-md border px-2.5 py-1.5 bg-background/30', c.border)}>
                <p className={cn('text-nano font-semibold', c.text)}>{types}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Функции ── */}
      <SectionTitle>Все функции</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard icon={Flame}      color="orange"  title="Ритуалы"              tag="Ежедневно"       description="Утренние и вечерние ритуалы — повторяющиеся действия для формирования привычек."               items={['Утренние: зарядка, медитация, витамины', 'Вечерние: планирование, чтение', 'Обеты — долгосрочные практики с серией']} />
        <FeatureCard icon={CheckSquare} color="violet" title="Задачи"               tag="4 категории"     description="4 настраиваемые категории задач. Можно переименовать под себя — Спорт, Учёба, Работа."         items={['Категории с разными типами задач', 'Прогресс считается в % к дню', 'Иконки и название настраиваются']} />
        <FeatureCard icon={BookHeart}   color="rose"   title="Дневник и настроение" tag="Каждый день"     description="Текстовые записи с категориями и оценкой настроения от 1 до 5."                               items={['Кастомные эмодзи для настроений', 'Категории и цитаты-подсказки', 'Хранится полностью локально']} />
        <FeatureCard icon={PiggyBank}   color="emerald" title="Финансы"             tag="Доходы / Расходы" description="Несколько счетов, категории транзакций, баланс в реальном времени."                          items={['Карта, наличные, вклад — любые счета', 'Свои категории доходов и расходов', 'Итог дня в боковой панели']} />
        <FeatureCard icon={Salad}       color="lime"   title="Питание"              tag="КБЖУ"            description="База продуктов, пресеты приёмов пищи, учёт калорий и БЖУ за день."                            items={['Собственная база продуктов', 'Пресеты блюд для быстрого добавления', 'Цель по калориям — тип задачи']} />
        <FeatureCard icon={BarChart3}   color="blue"   title="Статистика"           tag="Графики"         description="Визуальные графики прогресса по всем разделам за любой период."                               items={['Ежедневные очки и категории', 'История настроения', 'Финансовые тренды и баланс']} />
        <FeatureCard icon={Ghost}       color="slate"  title="Досуг"                tag="2 типа"          description="Наполняющий досуг (книги, прогулки, творчество) и эскапизм (сериалы, игры)."                  items={['Наполнение заряжает и развивает', 'Эскапизм — расслабление, но в меру', 'Видно, какой тип досуга преобладает']} />
        <FeatureCard icon={CalendarDays} color="cyan"  title="Календарь"            tag="История"         description="Месячный вид с цветовой индикацией всех дней. Переход к любому дню."                          items={['Зелёный — хороший день (75%+)', 'Серый — нейтральный день', 'Тёмный — упущенный день']} />
        <FeatureCard icon={Music2}      color="indigo" title="Фоновая музыка"       tag="Таймер"          description="Локальные треки для фокуса, секундомера и перерывов. Папка ambient сканируется автоматически." items={['Показывает найденные аудиофайлы', 'Добавляет новые файлы как пресеты', 'Дефолты выбираются для таймера и break-фазы']} />
      </div>

      {/* ── Типы задач ── */}
      <SectionTitle>Типы задач подробно</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/25 bg-muted/8 px-5 divide-y-0">
          <TaskTypeRow icon={CheckSquare} color="violet" name="Чекбокс" hint="нажать — выполнено"   description="Самый простой тип. Задача либо выполнена, либо нет. Прогресс: 0% или 100%."               example="Сделать зарядку · Выпить витамины · Прочитать главу" />
          <TaskTypeRow icon={Hash}        color="blue"   name="Число"   hint="ввести значение"       description="Вводишь числовое значение. Прогресс = введённое ÷ целевое из настроек."                   example="10 000 шагов · 8 стаканов воды · 60 минут тренировки" />
          <TaskTypeRow icon={Star}        color="amber"  name="Список"  hint="несколько подпунктов"  description="Задача с несколькими чекбоксами внутри. Прогресс — доля выполненных подпунктов."          example="Уборка: кухня, ванная, комната, пылесос" />
        </div>
        <div className="rounded-xl border border-border/25 bg-muted/8 px-5 divide-y-0">
          <TaskTypeRow icon={Timer} color="cyan"    name="Таймер"  hint="только в категории Фокус" description="Запускаешь таймер — он считает время. Все сессии за день суммируются автоматически." example="90 мин deep work · 45 мин программирование" />
          <TaskTypeRow icon={Salad} color="emerald" name="Питание" hint="только в категории Тонус" description="Прогресс берётся автоматически из журнала питания. Только одна такая задача на категорию." example="Цель 2000 ккал — заполняется из раздела питания" />
        </div>
      </div>

      {/* ── Быстрый старт ── */}
      <SectionTitle>Быстрый старт</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([
          { n: '01', color: 'violet'  as Color, title: 'Настрой оформление', desc: 'Тема, цвет, шрифт и валюта — раздел «Оформление и данные».' },
          { n: '02', color: 'orange'  as Color, title: 'Добавь ритуалы',     desc: '3–5 утренних и 2–3 вечерних действия в разделах ритуалов.' },
          { n: '03', color: 'blue'    as Color, title: 'Настрой задачи',     desc: 'В каждой из 4 категорий добавь свои задачи. Переименуй категории.' },
          { n: '04', color: 'emerald' as Color, title: 'Создай счета',       desc: 'Карта, наличные — добавь с текущим балансом в разделе «Счета».' },
          { n: '05', color: 'rose'    as Color, title: 'Веди дневник',       desc: 'Утром — планы. Вечером — итог дня и оценка настроения.' },
          { n: '06', color: 'amber'   as Color, title: 'Смотри статистику',  desc: 'Через неделю загляни в Статистику — увидишь свои паттерны и лучшие дни.' },
        ]).map(({ n, color, title, desc }) => {
          const c = COLOR_MAP[color];
          return (
            <div key={n} className={cn('flex gap-3.5 rounded-xl border px-4 py-3.5', c.bg, c.border)}>
              <span className={cn('font-mono text-base font-bold shrink-0 w-6 leading-none pt-0.5', c.text)}>{n}</span>
              <div>
                <p className="text-xs font-semibold text-foreground mb-0.5">{title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            </div>
          );
        })}
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
