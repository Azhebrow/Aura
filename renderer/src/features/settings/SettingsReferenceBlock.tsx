import { useState } from 'react';
import {
  AlignJustify,
  AlignLeft,
  Apple,
  Braces,
  CheckSquare,
  ChevronDown,
  Clock,
  Hash,
  List,
  ListTodo,
  Palette,
  Sun,
} from 'lucide-react';
import type { SettingsReference, TaskTypeGuide } from '@/features/settings/settings-references';
import { SETTINGS_REFERENCES } from '@/features/settings/settings-references';
import { cn } from '@/lib/utils';

/* ─── type metadata ──────────────────────────────────────────────────────── */

type FieldMeta = { icon: React.ElementType; label: string; color: string; bg: string; border: string };

const FIELD_META: Record<string, FieldMeta> = {
  text:     { icon: AlignLeft,    label: 'текст',   color: 'text-slate-400',   bg: 'bg-slate-500/10',   border: 'border-slate-500/25'   },
  number:   { icon: Hash,         label: 'число',   color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/25'    },
  select:   { icon: List,         label: 'выбор',   color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/25'  },
  color:    { icon: Palette,      label: 'цвет',    color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25'   },
  checkbox: { icon: CheckSquare,  label: 'флаг',    color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  textarea: { icon: AlignJustify, label: 'текст+',  color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/25'    },
  json:     { icon: Braces,       label: 'json',    color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/25'  },
};

const TASK_META: Record<string, { icon: React.ElementType; color: string }> = {
  checkbox:  { icon: CheckSquare, color: 'text-violet-400'  },
  number:    { icon: Hash,        color: 'text-blue-400'    },
  list:      { icon: ListTodo,    color: 'text-amber-400'   },
  timer:     { icon: Clock,       color: 'text-cyan-400'    },
  nutrition: { icon: Apple,       color: 'text-emerald-400' },
  ritual:    { icon: Sun,         color: 'text-orange-400'  },
};

function normalizeFieldName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .trim();
}

/* ─── field row ──────────────────────────────────────────────────────────── */

function FieldRow({ field }: { field: SettingsReference['fields'][number] }) {
  const [open, setOpen] = useState(false);
  const m = FIELD_META[field.type];
  const Icon = m?.icon ?? Hash;

  return (
    <div
      className={cn(
        'rounded-md transition-all duration-200 cursor-pointer select-none overflow-hidden',
        open
          ? cn(m?.bg ?? 'bg-muted/20', m?.border ? `border ${m.border}` : 'border border-[var(--aura-border-soft)]')
          : 'border border-transparent hover:bg-[var(--aura-surface-item)] hover:border-[var(--aura-border-soft)]'
      )}
      onClick={() => setOpen(p => !p)}
    >
      {/* Compact main row */}
      <div className="flex items-center gap-2 px-2 py-1">
        <Icon className={cn('size-3 shrink-0 transition-colors', open ? (m?.color ?? 'text-muted-foreground') : 'text-[var(--aura-text-subtle)]')} aria-hidden />
        <span className={cn('flex-1 min-w-0 truncate text-xs font-medium transition-colors', open ? 'text-foreground' : 'text-foreground/75')}>
          {field.name}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {field.required && <span className={cn('font-bold transition-colors', open ? 'text-primary' : 'text-primary/60')}>*</span>}
          <span className={cn('text-micro font-bold uppercase tracking-wider transition-colors', open ? (m?.color ?? 'text-muted-foreground') : 'text-[var(--aura-text-subtle)]')}>
            {m?.label ?? field.type}
          </span>
          <ChevronDown className={cn('size-3 shrink-0 text-[var(--aura-text-subtle)] transition-transform duration-200 ml-0.5', open && 'rotate-180')} />
        </div>
      </div>

      {/* Expanded description */}
      <div className={cn('grid transition-all duration-200', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p className="px-2 pb-2 pt-0.5 text-caption leading-relaxed text-[var(--aura-text-muted)]">
            {field.description}
            {field.required && <span className="ml-1.5 font-semibold text-primary/60">· обязательное</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── task type detail ───────────────────────────────────────────────────── */

function TaskDetail({ guide }: { guide: TaskTypeGuide }) {
  return (
    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs">
      <div className="rounded-md bg-[var(--aura-surface-raised)] px-2.5 py-2">
        <p className="text-micro font-bold uppercase tracking-widest text-[var(--aura-text-muted)] mb-1">Как выполнять</p>
        <p className="leading-relaxed text-foreground/75">{guide.howToComplete}</p>
      </div>
      <div className="rounded-md bg-[var(--aura-surface-raised)] px-2.5 py-2">
        <p className="text-micro font-bold uppercase tracking-widest text-[var(--aura-text-muted)] mb-1">Пример</p>
        <p className="leading-relaxed text-foreground/75">{guide.example}</p>
      </div>
      {guide.note && (
        <p className="sm:col-span-2 text-[var(--aura-text-subtle)] italic leading-relaxed">{guide.note}</p>
      )}
    </div>
  );
}

/* ─── section label ──────────────────────────────────────────────────────── */

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-micro font-bold uppercase tracking-[0.15em] text-[var(--aura-text-muted)] mb-2">
      {children}
    </p>
  );
}

/* ─── main ───────────────────────────────────────────────────────────────── */

export function SettingsReferenceBlock({
  reference,
  onNavigate,
  visibleFieldNames,
}: {
  reference: SettingsReference;
  onNavigate?: (sectionId: string) => void;
  visibleFieldNames?: readonly string[];
}) {
  const [openTaskType, setOpenTaskType] = useState<string | null>(null);
  const [openFuncIdx, setOpenFuncIdx] = useState<number | null>(null);

  const available   = reference.taskTypeGuide?.filter((t) => t.available)  ?? [];
  const unavailable = reference.taskTypeGuide?.filter((t) => !t.available) ?? [];
  const visibleFieldNameSet = visibleFieldNames ? new Set(visibleFieldNames.map(normalizeFieldName)) : null;
  const fields = visibleFieldNameSet
    ? reference.fields.filter((field) => visibleFieldNameSet.has(normalizeFieldName(field.name)))
    : reference.fields;

  return (
    <div className="rounded-xl border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] overflow-hidden text-xs">

      {/* ── Шапка ── */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-[var(--aura-border-soft)] bg-[color-mix(in_oklab,var(--aura-surface-raised)_50%,transparent)]">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
          <reference.icon className="size-3.5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-foreground">{reference.title}</span>
            <span className="shrink-0 rounded border border-[var(--aura-border-soft)] bg-[var(--aura-surface-item)] px-1.5 py-px text-micro font-bold uppercase tracking-wider text-[var(--aura-text-subtle)]">
              справочник
            </span>
          </div>
          <p className="text-[var(--aura-text-muted)] leading-snug text-caption">{reference.definition}</p>
        </div>
      </div>

      <div className="divide-y divide-[var(--aura-border-soft)]">

        {/* ── Где используется ── */}
        {reference.usedOn.length > 0 && (
          <div className="px-3.5 py-3">
            <SLabel>Где используется</SLabel>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {reference.usedOn.map((u, i) =>
                u.isNavLink && u.sectionId ? (
                  <button key={i} type="button" onClick={() => onNavigate?.(u.sectionId!)}
                    className="inline-flex items-center gap-1 text-[var(--aura-text-muted)] hover:text-foreground aura-tx-colors">
                    <span>{u.page}</span>
                    <span className="text-[var(--aura-text-disabled)]">›</span>
                    <span className="font-medium text-primary/80 hover:text-primary">{u.section}</span>
                  </button>
                ) : (
                  <span key={i} className="inline-flex items-center gap-1 text-[var(--aura-text-muted)]">
                    <span>{u.page}</span>
                    <span className="text-[var(--aura-text-disabled)]">›</span>
                    <span>{u.section}</span>
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* ── Поля ── */}
        {fields.length > 0 && (
          <div className="px-3.5 py-3">
            <div className="flex items-center justify-between mb-2">
              <SLabel>Поля</SLabel>
              <span className="text-micro font-bold text-[var(--aura-text-subtle)] -mt-2">{fields.length} полей · нажмите для описания</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {fields.map((f) => (
                <FieldRow key={`${f.name}-${f.type}`} field={f} />
              ))}
            </div>
          </div>
        )}

        {/* ── Типы задач ── */}
        {(available.length > 0 || unavailable.length > 0) && (
          <div className="px-3.5 py-3">
            <SLabel>Типы задач</SLabel>
            <div className="flex flex-wrap gap-1.5">
              {available.map((t) => {
                const m = TASK_META[t.type];
                const Icon = m?.icon;
                const isOpen = openTaskType === t.type;
                return (
                  <button key={t.type} type="button"
                    onClick={() => setOpenTaskType(p => p === t.type ? null : t.type)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                      isOpen
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-[var(--aura-border-soft)] bg-[var(--aura-surface-item)] text-[var(--aura-text-subtle)] hover:border-[var(--aura-border-strong)] hover:text-foreground'
                    )}>
                    {Icon && <Icon className={cn('size-3 shrink-0', isOpen ? 'text-primary' : (m?.color ?? ''))} aria-hidden />}
                    {t.name}
                    <ChevronDown className={cn('size-3 shrink-0 opacity-50 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                );
              })}
              {unavailable.map((t) => {
                const m = TASK_META[t.type];
                const Icon = m?.icon;
                return (
                  <span key={t.type} title={t.unavailableReason}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--aura-border-soft)] px-2 py-1 text-xs opacity-35">
                    {Icon && <Icon className="size-3 shrink-0 text-[var(--aura-text-disabled)]" aria-hidden />}
                    <span className="line-through text-[var(--aura-text-disabled)]">{t.name}</span>
                  </span>
                );
              })}
            </div>
            {openTaskType && (() => {
              const guide = available.find(t => t.type === openTaskType);
              return guide ? (
                <div>
                  <p className="mt-2.5 text-[var(--aura-text-muted)] leading-relaxed">{guide.description}</p>
                  <TaskDetail guide={guide} />
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* ── На что влияет ── */}
        {reference.impacts && reference.impacts.length > 0 && (
          <div className="px-3.5 py-3">
            <SLabel>На что влияет</SLabel>
            <div className="space-y-1.5">
              {reference.impacts.map((imp, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="mt-[5px] size-1 shrink-0 rounded-full bg-primary/70" />
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground">{imp.title}</span>
                    <span className="text-[var(--aura-text-subtle)] mx-1.5">·</span>
                    <span className="text-foreground/70">{imp.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Связанные разделы ── */}
        {reference.relatedSettings.length > 0 && (
          <div className="px-3.5 py-3">
            <SLabel>Связанные разделы</SLabel>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {reference.relatedSettings.map((rel, i) => {
                const ref = SETTINGS_REFERENCES[rel.sectionId];
                return (
                  <button key={i} type="button" onClick={() => onNavigate?.(rel.sectionId)} title={rel.reason}
                    className="inline-flex items-center gap-1 text-[var(--aura-text-muted)] hover:text-foreground aura-tx-colors">
                    <span className="font-medium">{ref?.title ?? rel.sectionId}</span>
                    <span className="text-[var(--aura-text-disabled)]">→</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Дополнительно ── */}
        {reference.additionalFunctions.length > 0 && (
          <div className="px-3.5 py-3">
            <SLabel>Дополнительно</SLabel>
            <div className="space-y-px">
              {reference.additionalFunctions.map((func, i) => {
                const isOpen = openFuncIdx === i;
                return (
                  <div key={i}>
                    <button type="button" onClick={() => setOpenFuncIdx(p => p === i ? null : i)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--aura-action-hover-bg)]">
                      <span className="font-medium text-foreground">{func.name}</span>
                      <ChevronDown className={cn('size-3.5 shrink-0 text-[var(--aura-text-subtle)] transition-transform duration-150', isOpen && 'rotate-180')} />
                    </button>
                    <div className={cn('grid transition-all duration-200', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                      <div className="overflow-hidden">
                        <div className="mx-2 mb-1.5 mt-0.5 rounded-md bg-[var(--aura-surface-raised)] px-3 py-2.5">
                          <p className="leading-relaxed text-foreground/75 mb-2">{func.description}</p>
                          <p className="text-micro font-bold uppercase tracking-widest text-[var(--aura-text-muted)] mb-1">Пример</p>
                          <p className="font-mono text-caption text-foreground/70 leading-relaxed">{func.example}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
