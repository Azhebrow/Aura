import type { ElementType, ReactNode } from 'react';
import {
  ArrowDown,
  BarChart3,
  BookHeart,
  CalendarDays,
  CheckSquare,
  Clock3,
  Database,
  Flame,
  LineChart,
  ListChecks,
  Moon,
  PiggyBank,
  Salad,
  Settings2,
  Sparkles,
  Sun,
  Timer,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type IconType = ElementType;
type Tone = 'neutral' | 'focus' | 'warm' | 'success' | 'risk';

const TONE: Record<Tone, { text: string; bg: string; border: string; line: string }> = {
  neutral: { text: 'text-dim', bg: 'bg-control/25', border: 'border-soft', line: 'bg-muted-foreground/45' },
  focus: { text: 'text-primary', bg: 'bg-primary/8', border: 'border-primary/20', line: 'bg-primary/65' },
  warm: { text: 'text-amber-500', bg: 'bg-amber-500/8', border: 'border-amber-500/20', line: 'bg-amber-500/65' },
  success: { text: 'text-emerald-500', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20', line: 'bg-emerald-500/65' },
  risk: { text: 'text-rose-500', bg: 'bg-rose-500/8', border: 'border-rose-500/20', line: 'bg-rose-500/65' },
};

const DAY_STEPS = [
  {
    title: 'Собрать день',
    label: 'утро',
    icon: Sun,
    tone: 'warm' as Tone,
    text: 'Выбери дату, зафиксируй состояние и поставь задачи так, чтобы вечером было невозможно спорить с фактом: выполнено или нет.',
  },
  {
    title: 'Вести факты',
    label: 'день',
    icon: Timer,
    tone: 'focus' as Tone,
    text: 'Запускай таймер, отмечай задачи, добавляй питание и финансы сразу после факта. Всё, что не записано, легко превратить в оправдание.',
  },
  {
    title: 'Закрыть цикл',
    label: 'вечер',
    icon: Moon,
    tone: 'neutral' as Tone,
    text: 'Закрой день честно: что сделал, что провалил, где слил время, где удержал дисциплину. Плохой день не прячется, он записывается.',
  },
  {
    title: 'Разобрать паттерн',
    label: 'неделя',
    icon: LineChart,
    tone: 'success' as Tone,
    text: 'Смотри статистику как журнал контроля. Повторяющиеся провалы, слабые зоны, срывы и рост должны быть видны, а не замазаны настроением момента.',
  },
];

const MODULES = [
  ['Задачи', CheckSquare, 'план дня и проверка выполнения'],
  ['Фокус', Timer, 'учёт времени без самообмана'],
  ['Ритуалы', Flame, 'обязательный каркас утра и вечера'],
  ['Дневник', BookHeart, 'протокол состояния, решений и срывов'],
  ['Питание', Salad, 'контроль еды, калорий и БЖУ'],
  ['Финансы', PiggyBank, 'учёт денег и импульсивных решений'],
  ['Ранги', Trophy, 'длинная шкала дисциплины через очки'],
  ['Статистика', BarChart3, 'разбор фактов, а не ощущений'],
] as const;

const TASK_RULES = [
  ['Чекбокс', 'когда важен факт: сделал / не сделал'],
  ['Число', 'когда важен объём: страницы, подходы, деньги, вода'],
  ['Список', 'когда задача состоит из этапов'],
  ['Таймер', 'когда ценность в накопленном времени'],
  ['Питание', 'когда прогресс должен считаться из еды, а не руками'],
] as const;

function IconBadge({ icon: Icon, tone = 'neutral', className }: { icon: IconType; tone?: Tone; className?: string }) {
  const t = TONE[tone];
  return (
    <span
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg border bg-control/25', t.border, className)}
      aria-hidden
    >
      <Icon className={cn('size-4', t.text)} />
    </span>
  );
}

function Panel({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden border-t border-soft first:border-t-0">
      <div className="grid gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="min-w-0">
          {kicker ? <p className="text-nano font-semibold uppercase tracking-[0.14em] text-faint">{kicker}</p> : null}
          <h3 className="mt-1 text-base font-semibold leading-tight text-foreground">{title}</h3>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function MiniBar({ value, tone }: { value: number; tone: Tone }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-control">
      <div className={cn('h-full rounded-full', TONE[tone].line)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function AppGuidePanel() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col pb-4">
      <div className="overflow-hidden rounded-xl border border-soft bg-panel/45">
        <section className="grid min-h-[18rem] gap-0 border-b border-soft lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <div className="flex min-w-0 flex-col justify-center px-5 py-6 sm:px-7">
            <div className="flex items-center gap-3">
              <IconBadge icon={Sparkles} tone="focus" className="size-11" />
              <div className="min-w-0">
                <p className="text-nano font-semibold uppercase tracking-[0.16em] text-primary">AURA guide</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Жёсткий контроль дня без оправданий.</h2>
              </div>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-subtle sm:text-base">
              AURA нужна, чтобы день перестал расплываться в ощущениях. Здесь фиксируется всё важное:
              что было запланировано, что выполнено, где сорвался, куда ушло время, деньги, энергия и внимание.
              Не “примерно нормально”, а конкретно: факт, число, время, итог.
            </p>
          </div>

          <div className="border-t border-soft bg-control/20 p-5 lg:border-l lg:border-t-0">
            <div className="grid h-full min-h-[14rem] grid-rows-[auto_1fr_auto] gap-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Карта дня</p>
                <span className="rounded-md bg-control px-2 py-1 text-xs font-semibold tabular-nums text-dim">+45</span>
              </div>
              <div className="grid content-center gap-3">
                {[
                  ['Задачи', 72, 'focus' as Tone],
                  ['Фокус', 55, 'neutral' as Tone],
                  ['Тонус', 64, 'success' as Tone],
                  ['Риск', 28, 'risk' as Tone],
                ].map(([label, value, tone]) => (
                  <div key={String(label)} className="grid grid-cols-[4.25rem_minmax(0,1fr)_2.75rem] items-center gap-3">
                    <span className="truncate text-xs font-medium text-subtle">{label as string}</span>
                    <MiniBar value={value as number} tone={tone as Tone} />
                    <span className="text-right text-xs font-semibold tabular-nums text-foreground">{value}%</span>
                  </div>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-dim">Очки и проценты не утешают. Это счёт дня: что выполнено, что провалено и где цена бездействия.</p>
            </div>
          </div>
        </section>

        <Panel title="Как этим пользоваться" kicker="маршрут">
          <div className="grid gap-3">
            {DAY_STEPS.map((step, index) => {
              const t = TONE[step.tone];
              return (
                <div key={step.title} className="grid gap-3 rounded-lg border border-soft bg-card/35 p-3 sm:grid-cols-[2.75rem_minmax(0,1fr)]">
                  <div className="flex items-center gap-2 sm:flex-col sm:items-start">
                    <span className="text-nano font-semibold tabular-nums text-faint">{String(index + 1).padStart(2, '0')}</span>
                    <IconBadge icon={step.icon} tone={step.tone} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                      <span className={cn('text-nano font-semibold uppercase tracking-[0.12em]', t.text)}>{step.label}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-subtle">{step.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Из чего состоит AURA" kicker="система">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {MODULES.map(([title, Icon, text], index) => {
              const tone: Tone = index === 0 || index === 1 ? 'focus' : index === 2 || index === 6 ? 'warm' : index === 4 || index === 7 ? 'success' : 'neutral';
              return (
                <div key={title} className="min-w-0 rounded-lg border border-soft bg-control/20 p-3">
                  <div className="flex items-center gap-2">
                    <IconBadge icon={Icon} tone={tone} className="size-8" />
                    <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-subtle">{text}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Философия контроля" kicker="психология">
          <div className="grid gap-3 lg:grid-cols-3">
            {[
              ['Факты вместо оправданий', 'Если действие не записано, оно не считается. Если провал повторяется, его нужно видеть, а не объяснять настроением.', Database],
              ['Контроль вместо хаоса', 'AURA заставляет день иметь форму: план, факт, итог. Не чтобы казаться продуктивным, а чтобы видеть реальность.', Settings2],
              ['Дисциплина вместо тумана', 'Цель не в красивом настроении. Цель в том, чтобы каждый день оставлял проверяемый след.', CalendarDays],
            ].map(([title, text, Icon]) => (
              <div key={String(title)} className="rounded-lg border border-soft bg-card/35 p-4">
                <IconBadge icon={Icon as IconType} tone="neutral" />
                <p className="mt-3 text-sm font-semibold text-foreground">{title as string}</p>
                <p className="mt-2 text-sm leading-relaxed text-subtle">{text as string}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Как выбирать тип задачи" kicker="практика">
          <div className="overflow-hidden rounded-lg border border-soft">
            {TASK_RULES.map(([name, text]) => (
              <div key={name} className="grid gap-1 border-b border-soft bg-panel/20 px-3 py-3 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
                <p className="text-sm font-semibold text-foreground">{name}</p>
                <p className="text-sm leading-relaxed text-subtle">{text}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Что смотреть в статистике" kicker="анализ">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="space-y-2 text-sm leading-relaxed text-subtle">
              <p><span className="font-semibold text-foreground">График</span> нужен для динамики: растёт, падает, повторяется.</p>
              <p><span className="font-semibold text-foreground">Таблица</span> нужна для точных сравнений между периодами и категориями.</p>
              <p><span className="font-semibold text-foreground">Круговая диаграмма</span> нужна для долей: куда ушло время, деньги или внимание.</p>
              <p><span className="font-semibold text-foreground">Связи</span> нужны, чтобы видеть, какие привычки, срывы и состояния идут вместе.</p>
            </div>
            <div className="rounded-lg border border-soft bg-control/20 p-3">
              <div className="grid gap-2">
                <div className="flex items-center gap-2"><LineChart className="size-4 text-dim" /><span className="text-xs font-medium text-subtle">динамика</span></div>
                <div className="flex items-center gap-2"><ListChecks className="size-4 text-dim" /><span className="text-xs font-medium text-subtle">сравнение</span></div>
                <div className="flex items-center gap-2"><Trophy className="size-4 text-dim" /><span className="text-xs font-medium text-subtle">траектория</span></div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Старт без перегруза" kicker="первые 7 дней">
          <div className="grid gap-2">
            {[
              'Оставь включёнными только те страницы, которые реально будешь вести каждый день.',
              'Создай немного задач, но формулируй их так, чтобы выполнение было проверяемым.',
              'Сделай утренний и вечерний ритуал как обязательные точки контроля.',
              'Веди таймер, дневник, питание и финансы хотя бы неделю без пропусков.',
              'Через неделю открой статистику и убери всё, что не помогает контролировать день.',
            ].map((text, index) => (
              <div key={text} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 rounded-lg bg-control/20 px-3 py-2.5">
                <span className="text-xs font-semibold tabular-nums text-faint">{String(index + 1).padStart(2, '0')}</span>
                <p className="text-sm leading-relaxed text-subtle">{text}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
