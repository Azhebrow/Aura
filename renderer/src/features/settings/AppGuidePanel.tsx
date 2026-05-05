import { cn } from '@/lib/utils';
import {
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

/* ─── atoms ──────────────────────────────────────────────────────────────────── */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50 mb-4 mt-10', className)}>
      {children}
    </h3>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/20 bg-muted/20 px-4 py-3 text-center">
      <p className="font-mono text-base font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{label}</p>
    </div>
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
        {tag && <span className="text-[10px] font-medium text-muted-foreground/50 mt-1.5 shrink-0">{tag}</span>}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground mb-1">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {items && items.length > 0 && (
        <ul className="space-y-1 mt-auto pt-1">
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
          <span className="text-sm font-semibold text-foreground">{title}</span>
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

/* ─── rank row ───────────────────────────────────────────────────────────────── */

const RANKS = [
  { n: 1,  name: 'Никчёмный', pts: '0',      next: '500'    },
  { n: 2,  name: 'Лузер',     pts: '500',    next: '1 200'  },
  { n: 3,  name: 'Слабак',    pts: '1 200',  next: '2 100'  },
  { n: 4,  name: 'Работяга',  pts: '2 100',  next: '3 300'  },
  { n: 5,  name: 'Ученик',    pts: '3 300',  next: '4 800'  },
  { n: 6,  name: 'Воин',      pts: '4 800',  next: '6 600'  },
  { n: 7,  name: 'Воля',      pts: '6 600',  next: '8 700'  },
  { n: 8,  name: 'Сила',      pts: '8 700',  next: '11 100' },
  { n: 9,  name: 'Легенда',   pts: '11 100', next: '13 800' },
  { n: 10, name: 'Атлант',    pts: '13 800', next: '—'      },
];

function RankRow({ n, name, pts, next }: { n: number; name: string; pts: string; next: string }) {
  const isMax = n === 10;
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2.5 border-b border-border/10 last:border-0 min-w-0',
      isMax && 'bg-muted/15'
    )}>
      <span className="font-mono text-xs text-muted-foreground/40 w-4 shrink-0 text-right">{n}</span>
      <span className={cn('text-xs font-semibold flex-1 min-w-0', isMax ? 'text-foreground' : 'text-foreground/80')}>{name}</span>
      <span className="font-mono text-[11px] text-muted-foreground/60 shrink-0 text-right">{pts}</span>
      <span className="font-mono text-[11px] text-muted-foreground/35 shrink-0 text-right hidden sm:block">{next === '—' ? <span className="text-foreground/40">пик</span> : `→ ${next}`}</span>
    </div>
  );
}

/* ─── main ────────────────────────────────────────────────────────────────────── */

export function AppGuidePanel() {
  return (
    <div className="space-y-0 pb-6">

      {/* ── Hero ── */}
      <div className="rounded-xl border border-border/25 bg-muted/10 p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/25">
            <Sparkles className="size-6 text-foreground/60" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <h2 className="text-xl font-bold text-foreground tracking-tight">AURA</h2>
              <Chip>Только на компьютере</Chip>
              <Chip>Геймификация</Chip>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xl">
              Один инструмент вместо десяти приложений. Задачи, дневник, финансы, питание, статистика — всё в одном окне. Открыл утром, закрыл вечером. Без телефона.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            { icon: CheckSquare, label: 'Задачи и ритуалы' },
            { icon: BookHeart,   label: 'Дневник' },
            { icon: PiggyBank,   label: 'Финансы' },
            { icon: BarChart3,   label: 'Статистика' },
          ] as const).map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 rounded-lg border border-border/20 bg-background/40 px-3 py-2">
              <Icon className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
              <span className="text-xs text-muted-foreground truncate">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Концепция ── */}
      <SectionTitle>Основная идея</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { title: 'Всё в одном',       body: 'Задачи, дневник, питание, финансы, ритуалы, досуг — одно окно вместо десяти разных приложений.' },
          { title: 'Геймификация',       body: 'Каждое выполненное действие приносит % к дню. 100% = победа. Накопленные очки — твой ранг.' },
          { title: 'Без телефона',       body: 'Намеренно только для компьютера. Телефон отнимает внимание — AURA для осознанного времени за столом.' },
        ].map(({ title, body }) => (
          <div key={title} className="rounded-xl border border-border/20 bg-muted/8 px-5 py-4">
            <p className="text-sm font-semibold text-foreground mb-2">{title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      {/* ── Дневной ритм ── */}
      <SectionTitle>Дневной ритм</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/25 bg-muted/8 px-5 py-5">
          <WorkflowStep
            icon={Sun}
            time="утро"
            title="Запуск дня"
            description="Отмечаешь утренние ритуалы, пишешь запись в дневник, выставляешь настроение, намечаешь задачи."
          />
          <WorkflowStep
            icon={Timer}
            time="день"
            title="Работа и задачи"
            description="Запускаешь таймеры фокуса, отмечаешь чекбоксы, вводишь числовые показатели, логируешь питание."
          />
          <WorkflowStep
            icon={Moon}
            time="вечер"
            title="Итоги"
            description="Вечерние ритуалы, финансы за день, итоговый % прогресса и заработанные очки."
            last
          />
        </div>
        <div className="rounded-xl border border-border/25 bg-muted/8 px-5 py-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Панель дня</p>
          <p className="text-xs leading-relaxed text-muted-foreground">В боковой панели всегда видна сводка выбранного дня. Можно настроить, какие метрики показывать.</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { icon: CalendarDays, label: 'Прогресс дня' },
              { icon: TrendingUp,   label: 'Очки' },
              { icon: Timer,        label: 'Фокус' },
              { icon: Flame,        label: 'Ритуалы' },
              { icon: Salad,        label: 'Калории' },
              { icon: HandCoins,    label: 'Транзакции' },
              { icon: Wallet,       label: 'Баланс' },
              { icon: BookHeart,    label: 'Серия дней' },
            ] as const).map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-md border border-border/15 bg-background/30 px-2.5 py-1.5">
                <Icon className="size-3 shrink-0 text-muted-foreground/50" aria-hidden />
                <span className="text-[11px] text-muted-foreground/80 truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Система очков ── */}
      <SectionTitle>Система очков</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/25 bg-muted/8 p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Как считаются очки</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Каждый день получает оценку 0–100% на основе выполненных задач, ритуалов и активностей. Из процента вычисляется результат дня.</p>
          <div className="grid grid-cols-3 gap-2">
            <InfoTile label="100% = очки" value="+100" />
            <InfoTile label="50% = очки" value="0" />
            <InfoTile label="0% = очки" value="−100" />
          </div>
          <p className="text-[11px] text-muted-foreground/55 leading-relaxed">Формула: очки = (прогресс% × 2) − 100. Ниже 50% — уходишь в минус.</p>
        </div>
        <div className="rounded-xl border border-border/25 bg-muted/8 p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Градация дней</p>
          <div className="space-y-2">
            {[
              { label: 'Победный',   range: '+50 — +100', sub: '75–100% выполнено' },
              { label: 'Нейтральный', range: '−50 — +50',  sub: '40–75% выполнено' },
              { label: 'Упущенный',  range: '−100 — −50', sub: 'менее 40%' },
            ].map(({ label, range, sub }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border/15 bg-muted/20 px-3.5 py-2.5">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground/55">{sub}</p>
                </div>
                <span className="font-mono text-xs font-bold text-foreground/60 shrink-0">{range}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Ранги ── */}
      <SectionTitle>Ранги</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/25 bg-muted/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/15">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 min-w-0">
              <span className="w-4 shrink-0">#</span>
              <span className="flex-1 min-w-0">Ранг</span>
              <span className="shrink-0 text-right">От</span>
              <span className="shrink-0 text-right hidden sm:block">До</span>
            </div>
          </div>
          {RANKS.slice(0, 5).map((r) => <RankRow key={r.n} {...r} />)}
        </div>
        <div className="rounded-xl border border-border/25 bg-muted/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/15">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50 min-w-0">
              <span className="w-4 shrink-0">#</span>
              <span className="flex-1 min-w-0">Ранг</span>
              <span className="shrink-0 text-right">От</span>
              <span className="shrink-0 text-right hidden sm:block">До</span>
            </div>
          </div>
          {RANKS.slice(5).map((r) => <RankRow key={r.n} {...r} />)}
          <div className="px-4 py-3 border-t border-border/15 bg-muted/10">
            <div className="flex items-center gap-2">
              <Trophy className="size-3.5 text-muted-foreground/40" aria-hidden />
              <p className="text-[11px] text-muted-foreground/60">Ранг «Атлант» — максимальный. Для достижения нужно 13 800 очков.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Категории задач ── */}
      <SectionTitle>Категории задач</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { emoji: '✨', name: 'Рутина',  hint: 'ритуалы / чекбоксы', desc: 'Ежедневные практики и привычки. Поддерживает основу дня.', types: 'Чекбокс, Число, Список, Ритуал' },
          { emoji: '⏱',  name: 'Фокус',  hint: 'только таймер',        desc: 'Учёт времени глубокой работы. Только тип «Таймер».', types: 'Только Таймер' },
          { emoji: '💪', name: 'Тонус',  hint: 'здоровье / питание',   desc: 'Физическое состояние: тренировки, питание, тело.', types: 'Чекбокс, Число, Список, Питание' },
          { emoji: '🚫', name: 'Детокс', hint: 'только чекбокс',       desc: 'Ограничения и отказы. Победа — НЕ отметить галочку.', types: 'Только Чекбокс' },
        ].map(({ emoji, name, hint, desc, types }) => (
          <div key={name} className="rounded-xl border border-border/20 bg-muted/8 p-4 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{emoji}</span>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{name}</p>
                <p className="text-[10px] text-muted-foreground/50">{hint}</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
            <div className="rounded-md bg-muted/30 border border-border/15 px-2.5 py-1.5">
              <p className="text-[10px] text-muted-foreground/60 font-medium">{types}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Функции ── */}
      <SectionTitle>Все функции</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          description="4 настраиваемые категории задач. Можно переименовать под себя — Спорт, Учёба, Работа."
          items={['Категории с разными типами задач', 'Прогресс считается в % к дню', 'Иконки и название настраиваются']}
        />
        <FeatureCard
          icon={BookHeart}
          title="Дневник и настроение"
          tag="Каждый день"
          description="Текстовые записи с категориями и оценкой настроения от 1 до 5."
          items={['Кастомные эмодзи для настроений', 'Категории и цитаты-подсказки', 'Хранится полностью локально']}
        />
        <FeatureCard
          icon={PiggyBank}
          title="Финансы"
          tag="Доходы / Расходы"
          description="Несколько счетов, категории транзакций, баланс в реальном времени."
          items={['Карта, наличные, вклад — любые счета', 'Свои категории доходов и расходов', 'Итог дня в боковой панели']}
        />
        <FeatureCard
          icon={Salad}
          title="Питание"
          tag="КБЖУ"
          description="База продуктов, пресеты приёмов пищи, учёт калорий и БЖУ за день."
          items={['Собственная база продуктов', 'Пресеты блюд для быстрого добавления', 'Цель по калориям — тип задачи']}
        />
        <FeatureCard
          icon={BarChart3}
          title="Статистика"
          tag="Графики"
          description="Визуальные графики прогресса по всем разделам за любой период."
          items={['Ежедневные очки и категории', 'История настроения', 'Финансовые тренды и баланс']}
        />
        <FeatureCard
          icon={Ghost}
          title="Досуг"
          tag="2 типа"
          description="Наполняющий досуг (книги, прогулки, творчество) и эскапизм (сериалы, игры)."
          items={['Наполнение заряжает и развивает', 'Эскапизм — расслабление, но в меру', 'Видно, какой тип досуга преобладает']}
        />
        <FeatureCard
          icon={CalendarDays}
          title="Календарь"
          tag="История"
          description="Месячный вид с цветовой индикацией всех дней. Переход к любому дню."
          items={['Зелёный — хороший день (75%+)', 'Серый — нейтральный день', 'Тёмный — упущенный день']}
        />
        <FeatureCard
          icon={Music2}
          title="Фоновая музыка"
          tag="Атмосфера"
          description="Встроенный плеер с тематическими плейлистами для работы и концентрации."
        />
      </div>

      {/* ── Типы задач ── */}
      <SectionTitle>Типы задач подробно</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/25 bg-muted/8 px-5 divide-y-0">
          <TaskTypeRow
            icon={CheckSquare}
            name="Чекбокс"
            hint="нажать — выполнено"
            description="Самый простой тип. Задача либо выполнена, либо нет. Прогресс: 0% или 100%."
            example="Сделать зарядку · Выпить витамины · Прочитать главу"
          />
          <TaskTypeRow
            icon={Hash}
            name="Число"
            hint="ввести значение"
            description="Вводишь числовое значение. Прогресс = введённое ÷ целевое из настроек."
            example="10 000 шагов · 8 стаканов воды · 60 минут тренировки"
          />
          <TaskTypeRow
            icon={Star}
            name="Список"
            hint="несколько подпунктов"
            description="Задача с несколькими чекбоксами внутри. Прогресс — доля выполненных подпунктов."
            example="Уборка: кухня, ванная, комната, пылесос"
          />
        </div>
        <div className="rounded-xl border border-border/25 bg-muted/8 px-5 divide-y-0">
          <TaskTypeRow
            icon={Timer}
            name="Таймер"
            hint="только в категории Фокус"
            description="Запускаешь таймер — он считает время. Все сессии за день суммируются автоматически."
            example="90 мин deep work · 45 мин программирование"
          />
          <TaskTypeRow
            icon={Salad}
            name="Питание"
            hint="только в категории Тонус"
            description="Прогресс берётся автоматически из журнала питания. Только одна такая задача на категорию."
            example="Цель 2000 ккал — заполняется из раздела питания"
          />
        </div>
      </div>

      {/* ── Быстрый старт ── */}
      <SectionTitle>Быстрый старт</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[
          { n: '01', title: 'Настрой оформление',    desc: 'Тема, цвет, шрифт и валюта — раздел «Оформление и данные».' },
          { n: '02', title: 'Добавь ритуалы',         desc: '3–5 утренних и 2–3 вечерних действия в разделах ритуалов.' },
          { n: '03', title: 'Настрой задачи',          desc: 'В каждой из 4 категорий добавь свои задачи. Переименуй категории.' },
          { n: '04', title: 'Создай счета',            desc: 'Карта, наличные — добавь с текущим балансом в разделе «Счета».' },
          { n: '05', title: 'Веди дневник',            desc: 'Утром — планы. Вечером — итог дня и оценка настроения.' },
          { n: '06', title: 'Смотри статистику',       desc: 'Через неделю загляни в Статистику — увидишь свои паттерны и лучшие дни.' },
        ].map(({ n, title, desc }) => (
          <div key={n} className="flex gap-3.5 rounded-xl border border-border/20 bg-muted/8 px-4 py-3.5">
            <span className="font-mono text-base font-bold text-muted-foreground/25 shrink-0 w-6">{n}</span>
            <div>
              <p className="text-xs font-semibold text-foreground mb-0.5">{title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
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
