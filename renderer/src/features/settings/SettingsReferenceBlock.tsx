import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SettingsReference } from '@/features/settings/settings-references';
import { SETTINGS_REFERENCES } from '@/features/settings/settings-references';
import { cn } from '@/lib/utils';

type Props = {
  reference: SettingsReference;
  onNavigate?: (sectionId: string) => void;
};

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Текст',
  number: 'Число',
  select: 'Выбор',
  color: 'Цвет',
  checkbox: 'Флаг',
  textarea: 'Текст (многострочный)',
  json: 'JSON',
};

export function SettingsReferenceBlock({ reference, onNavigate }: Props) {
  const [expandedFunctions, setExpandedFunctions] = useState<Set<number>>(new Set());

  const toggleFunction = (index: number) => {
    const next = new Set(expandedFunctions);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedFunctions(next);
  };

  const getFieldTypeLabel = (type: string): string => {
    return FIELD_TYPE_LABELS[type] || type;
  };

  return (
    <section className="space-y-8 rounded-lg border border-border/40 bg-card/50 p-6 sm:p-8">
      {/* Header with icon and title */}
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted/60">
          <reference.icon className="size-6 text-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold text-foreground">{reference.title}</h3>
        </div>
      </div>

      {/* Definition */}
      <div className="space-y-3 border-t border-border/30 pt-6">
        <p className="text-sm leading-relaxed text-muted-foreground">{reference.definition}</p>
      </div>

      {/* Where it's used */}
      {reference.usedOn.length > 0 && (
        <div className="space-y-3 border-t border-border/30 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Где используется</p>
          <div className="flex flex-wrap gap-2">
            {reference.usedOn.map((usage, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate?.(usage.sectionId)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border border-border/40 px-3 py-2 text-xs font-medium transition-colors',
                  'hover:bg-muted/50 hover:border-border/60 active:bg-muted/70'
                )}
              >
                <span className="text-muted-foreground">{usage.page}</span>
                <span className="text-muted-foreground/50">›</span>
                <span className="font-medium text-foreground">{usage.section}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fields table */}
      {reference.fields.length > 0 && (
        <div className="space-y-3 border-t border-border/30 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Поля</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/30 bg-muted/20">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Имя</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Тип</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Требуется</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Описание</th>
                </tr>
              </thead>
              <tbody>
                {reference.fields.map((field, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      'border-b border-border/20 transition-colors',
                      idx % 2 === 0 ? 'bg-muted/10' : 'bg-transparent'
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className={cn('font-medium', field.required ? 'text-foreground' : 'text-muted-foreground')}>
                        {field.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded bg-muted/40 px-2 py-1 text-xs font-medium text-muted-foreground">
                        {getFieldTypeLabel(field.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {field.required ? (
                        <span className="inline-flex size-5 items-center justify-center rounded bg-foreground/10 text-xs font-bold text-foreground">
                          ✓
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{field.description}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Related settings */}
      {reference.relatedSettings.length > 0 && (
        <div className="space-y-3 border-t border-border/30 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Связанные настройки</p>
          <div className="flex flex-col gap-2.5">
            {reference.relatedSettings.map((related, idx) => {
              const relatedRef = SETTINGS_REFERENCES[related.sectionId];
              return (
                <button
                  key={idx}
                  onClick={() => onNavigate?.(related.sectionId)}
                  className={cn(
                    'rounded-md border border-border/30 px-4 py-3 text-left transition-colors',
                    'hover:bg-muted/40 hover:border-border/50 active:bg-muted/60'
                  )}
                >
                  <p className="text-sm font-medium text-foreground">{relatedRef?.title || related.sectionId}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{related.reason}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional functions */}
      {reference.additionalFunctions.length > 0 && (
        <div className="space-y-3 border-t border-border/30 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Дополнительные функции</p>
          <div className="flex flex-col gap-2">
            {reference.additionalFunctions.map((func, idx) => {
              const isExpanded = expandedFunctions.has(idx);
              return (
                <div
                  key={idx}
                  className={cn(
                    'overflow-hidden rounded-md border border-border/30 transition-all',
                    isExpanded ? 'bg-muted/20' : 'bg-muted/10'
                  )}
                >
                  <button
                    onClick={() => toggleFunction(idx)}
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors',
                      'hover:bg-muted/30 active:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{func.name}</p>
                      <ChevronDown
                        className={cn('size-4 shrink-0 text-muted-foreground transition-transform', {
                          'rotate-180': isExpanded,
                        })}
                        aria-hidden
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-border/20 bg-muted/5 px-4 py-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">{func.description}</p>
                      <div className="rounded-md bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground/80">Пример:</p>
                        <p className="mt-1">{func.example}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
