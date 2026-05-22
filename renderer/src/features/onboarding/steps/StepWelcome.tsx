// ─── StepWelcome ──────────────────────────────────────────────────────────────
// Шаг 0: приветствие, описание возможностей и кнопка «Начать настройку».

import { ChevronRight, LayoutDashboard, Sparkle, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WELCOME_FEATURE_ICONS } from '../onboarding-config';

type Props = { onNext: () => void };

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-8 sm:px-8">
      {/* Логотип и слоган */}
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background/50">
            <Sparkle className="size-6 text-primary" strokeWidth={1.6} />
          </div>
          <span
            className="font-heading text-4xl font-bold tracking-tight text-foreground"
            style={{ letterSpacing: '-0.02em' }}
          >
            AURA
          </span>
        </div>
        <p className="relative max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
          Собери день в одну ясную систему: что сделать, где просадка, какой ритм держит тебя в форме.
        </p>
      </div>

      {/* Ключевые фичи */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {[
          { icon: LayoutDashboard, label: 'Всё в одном' },
          { icon: Trophy,          label: 'Геймификация' },
          { icon: Sparkle,         label: 'Личный ритм' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full border border-border/70 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground/80 shadow-xs"
          >
            <Icon className="size-3.5 text-primary opacity-80" strokeWidth={1.75} />
            {label}
          </div>
        ))}
      </div>

      {/* Иконки разделов приложения */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
        {WELCOME_FEATURE_ICONS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-background/45 shadow-xs">
              <Icon className="size-4 text-primary/80" strokeWidth={1.75} />
            </div>
            <span className="text-nano text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Три шага работы с AURA */}
      <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-background/35 p-3">
        <p className="mb-3 text-center text-caption font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Как работает день в AURA
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
          {[
            { n: '1', title: 'Отмечай день',  text: 'Ритуалы, задачи, таймер и дневник.' },
            { n: '2', title: 'Смотри сигнал', text: 'Главная показывает, где просадка.' },
            { n: '3', title: 'Копи ранг',     text: 'Прогресс дня превращается в очки.' },
          ].map((item, idx, arr) => (
            <div key={item.n} className="contents">
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/12 text-nano font-bold text-primary">
                    {item.n}
                  </span>
                  <p className="truncate text-xs font-bold text-foreground">{item.title}</p>
                </div>
                <p className="text-caption leading-snug text-muted-foreground">{item.text}</p>
              </div>
              {idx < arr.length - 1 ? (
                <div className="hidden items-center justify-center text-muted-foreground/50 sm:flex">
                  <ChevronRight className="size-4" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={onNext} className="gap-2 px-7 shadow-md shadow-primary/20">
        Начать настройку
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
