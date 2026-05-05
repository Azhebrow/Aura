import { useState } from 'react';
import { ChevronDown, MapPin, Zap, Link2, Layers, Sparkles, CheckSquare, Hash, Sun, ListTodo, Clock, Apple, Lightbulb } from 'lucide-react';
import type { SettingsReference, TaskTypeGuide } from '@/features/settings/settings-references';
import { SETTINGS_REFERENCES } from '@/features/settings/settings-references';
import { cn } from '@/lib/utils';

type Props = {
  reference: SettingsReference;
  onNavigate?: (sectionId: string) => void;
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Текст',
  number: 'Число',
  select: 'Выбор из списка',
  color: 'Цвет',
  checkbox: 'Флажок',
  textarea: 'Многострочный текст',
  json: 'JSON-объект',
};

const TASK_TYPE_ICONS: Record<string, React.ElementType> = {
  checkbox: CheckSquare,
  number: Hash,
  ritual: Sun,
  list: ListTodo,
  timer: Clock,
  nutrition: Apple,
};

function TaskTypeCard({ guide }: { guide: TaskTypeGuide }) {
  const [open, setOpen] = useState(false);
  const Icon = TASK_TYPE_ICONS[guide.type];
  return (
    <div className={cn('rounded-lg border border-border/20 overflow-hidden', open ? 'bg-muted/10' : 'bg-muted/5')}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOpen(v => !v)}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/15 transition-colors select-none"
      >
        {Icon && <Icon className="size-5 shrink-0 text-foreground/70" aria-hidden />}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{guide.name}</span>
          {!open && (
            <span className="ml-2 text-xs text-muted-foreground truncate">{guide.description.split('.')[0]}.</span>
          )}
        </div>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground/50 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </div>
      {open && (
        <div className="border-t border-border/15 px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{guide.description}</p>
          <div className="rounded-lg bg-muted/20 border border-border/15 px-4 py-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Как выполнять</p>
            <p className="text-sm leading-relaxed text-foreground/80">{guide.howToComplete}</p>
          </div>
          <div className="rounded-lg border border-border/15 bg-muted/10 px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Пример</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{guide.example}</p>
          </div>
          {guide.note && (
            <div className="flex gap-2 rounded-lg border border-border/15 bg-muted/10 px-3.5 py-2.5">
              <Lightbulb className="size-4 shrink-0 text-foreground/60 mt-0.5" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">{guide.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UnavailableTypeChip({ guide }: { guide: TaskTypeGuide }) {
  const Icon = TASK_TYPE_ICONS[guide.type];
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border/15 bg-muted/5 px-3 py-2.5 opacity-60">
      {Icon && <Icon className="size-4 shrink-0 text-foreground/40 mt-0.5" aria-hidden />}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground/60 line-through">{guide.name}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground/70 mt-0.5">{guide.unavailableReason}</p>
      </div>
    </div>
  );
}

function SectionHeading({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 pb-3 border-b', color)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
    </div>
  );
}

export function SettingsReferenceBlock({ reference, onNavigate }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="rounded-xl border border-border/30 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-start gap-4 px-3 sm:px-6 py-5 bg-muted/20">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-background border border-border/30">
          <reference.icon className="size-5 text-foreground/70" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Справочник</p>
          <h3 className="text-base font-semibold text-foreground">{reference.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{reference.definition}</p>
        </div>
      </div>

      {/* ── Where used ── */}
      {reference.usedOn.length > 0 && (
        <div className="px-3 sm:px-6 py-5 border-t border-border/20">
          <SectionHeading icon={MapPin} label="Где используется" color="border-border/15" />
          <div className="mt-4 flex flex-wrap gap-2">
            {reference.usedOn.map((usage, i) =>
              usage.isNavLink && usage.sectionId ? (
                <button
                  key={i}
                  onClick={() => onNavigate?.(usage.sectionId!)}
                  className="flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted/30 hover:border-border/50 transition-colors"
                >
                  <span className="opacity-60">{usage.page}</span>
                  <span className="opacity-40">›</span>
                  <span>{usage.section}</span>
                </button>
              ) : (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <span className="font-medium text-foreground/70">{usage.page}</span>
                  <span className="opacity-40">›</span>
                  <span>{usage.section}</span>
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* ── Impacts ── */}
      {reference.impacts && reference.impacts.length > 0 && (
        <div className="px-3 sm:px-6 py-5 border-t border-border/20">
          <SectionHeading icon={Zap} label="На что влияет" color="border-border/15" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reference.impacts.map((impact, i) => (
              <div key={i} className="rounded-lg border border-border/15 bg-muted/10 p-2.5 sm:p-3.5">
                <p className="text-xs font-semibold text-foreground mb-1.5">{impact.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{impact.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Task type guide ── */}
      {reference.taskTypeGuide && reference.taskTypeGuide.length > 0 && (
        <div className="px-3 sm:px-6 py-5 border-t border-border/20">
          <SectionHeading icon={Sparkles} label="Типы задач" color="border-border/15" />
          <div className="mt-4 space-y-4">
            {(() => {
              const available = reference.taskTypeGuide!.filter(t => t.available);
              const unavailable = reference.taskTypeGuide!.filter(t => !t.available);
              return (
                <>
                  <div className="space-y-3">
                    {available.map(t => <TaskTypeCard key={t.type} guide={t} />)}
                  </div>
                  {unavailable.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">Недоступно в этой категории</p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {unavailable.map(t => <UnavailableTypeChip key={t.type} guide={t} />)}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Fields ── */}
      {reference.fields.length > 0 && (
        <div className="px-3 sm:px-6 py-5 border-t border-border/20">
          <SectionHeading icon={Layers} label="Поля" color="border-border/15" />
          <div className="mt-4 rounded-lg border border-border/20 overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/25 border-b border-border/20">
                  <th className="px-3 sm:px-4 py-2.5 text-left text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">Поле</th>
                  <th className="px-3 sm:px-4 py-2.5 text-left text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">Тип</th>
                  <th className="px-2 sm:px-3 py-2.5 text-center text-[11px] sm:text-xs font-semibold text-foreground shrink-0">Обязательно</th>
                  <th className="px-3 sm:px-4 py-2.5 text-left text-[11px] sm:text-xs font-semibold text-foreground min-w-[12rem]">Описание</th>
                </tr>
              </thead>
              <tbody>
                {reference.fields.map((field, i) => (
                  <tr key={i} className={cn('border-b border-border/10 last:border-0', i % 2 === 1 && 'bg-muted/10')}>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs font-medium text-foreground whitespace-nowrap">{field.name}</td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                      <span className="inline-flex rounded bg-muted/60 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                        {FIELD_TYPE_LABELS[field.type] ?? field.type}
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-2.5 sm:py-3 text-center shrink-0">
                      {field.required ? (
                        <span className="inline-flex size-4 sm:size-5 items-center justify-center rounded bg-green-500/15 text-[10px] sm:text-xs font-bold text-green-700">✓</span>
                      ) : (
                        <span className="text-[10px] sm:text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs leading-relaxed text-muted-foreground">{field.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Related ── */}
      {reference.relatedSettings.length > 0 && (
        <div className="px-3 sm:px-6 py-5 border-t border-border/20">
          <SectionHeading icon={Link2} label="Связанные разделы" color="border-border/15" />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {reference.relatedSettings.map((rel, i) => {
              const ref = SETTINGS_REFERENCES[rel.sectionId];
              return (
                <button
                  key={i}
                  onClick={() => onNavigate?.(rel.sectionId)}
                  className="rounded-lg border border-border/30 bg-muted/15 p-2.5 sm:p-3.5 text-left hover:bg-muted/25 hover:border-border/40 transition-colors group"
                >
                  <p className="text-xs font-semibold text-foreground mb-1">
                    {ref?.title ?? rel.sectionId}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{rel.reason}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Additional functions ── */}
      {reference.additionalFunctions.length > 0 && (
        <div className="px-3 sm:px-6 py-5 border-t border-border/20">
          <SectionHeading icon={Sparkles} label="Дополнительные возможности" color="text-foreground/60 border-border/40" />
          <div className="mt-4 flex flex-col divide-y divide-border/15 rounded-lg border border-border/20 overflow-hidden">
            {reference.additionalFunctions.map((func, i) => {
              const isOpen = expanded.has(i);
              return (
                <div key={i} className={cn('transition-colors', isOpen ? 'bg-muted/15' : 'bg-transparent')}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(i)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(i)}
                    className="flex items-center justify-between gap-2 sm:gap-3 px-2.5 sm:px-4 py-2.5 sm:py-3.5 cursor-pointer hover:bg-muted/20 transition-colors select-none"
                  >
                    <span className="text-sm font-medium text-foreground">{func.name}</span>
                    <ChevronDown
                      className={cn('size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200', isOpen && 'rotate-180')}
                      aria-hidden
                    />
                  </div>
                  {isOpen && (
                    <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4 pt-0 space-y-2 sm:space-y-3 border-t border-border/15">
                      <p className="text-sm leading-relaxed text-muted-foreground pt-3">{func.description}</p>
                      <div className="rounded-md bg-muted/25 border border-border/20 px-2.5 sm:px-4 py-2 sm:py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">Пример</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{func.example}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
