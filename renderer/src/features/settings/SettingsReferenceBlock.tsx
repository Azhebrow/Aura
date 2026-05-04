import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SettingsReference } from '@/features/settings/settings-references';
import { SETTINGS_REFERENCES } from '@/features/settings/settings-references';
import { cn } from '@/lib/utils';

type Props = {
  reference: SettingsReference;
  onNavigate?: (sectionId: string) => void;
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

  return (
    <section className="space-y-6 rounded-lg border border-border/60 bg-muted/20 p-5">
      {/* Header with icon and title */}
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/40">
          <reference.icon className="size-5 text-foreground" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground">{reference.title}</h3>
        </div>
      </div>

      {/* Definition */}
      <div className="space-y-2 border-t border-border/40 pt-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{reference.definition}</p>
      </div>

      {/* Where it's used */}
      {reference.usedOn.length > 0 && (
        <div className="space-y-2.5 border-t border-border/40 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Где используется</p>
          <div className="flex flex-wrap gap-2">
            {reference.usedOn.map((usage, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate?.(usage.sectionId)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1.5 text-xs font-medium transition-colors',
                  'hover:bg-muted/60 hover:border-border/60 active:bg-muted/80'
                )}
              >
                <span className="text-muted-foreground">{usage.page}</span>
                <span className="text-muted-foreground/60">›</span>
                <span className="text-foreground">{usage.section}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fields table */}
      {reference.fields.length > 0 && (
        <div className="space-y-2.5 border-t border-border/40 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Поля</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Имя</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Тип</th>
                  <th className="px-3 py-2 text-center font-semibold text-foreground">Обязательное</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Описание</th>
                </tr>
              </thead>
              <tbody>
                {reference.fields.map((field, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      'border-b border-border/30 transition-colors',
                      idx % 2 === 0 ? 'bg-muted/15' : 'bg-transparent'
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <span className={cn('font-medium', field.required ? 'text-foreground' : 'text-muted-foreground')}>
                        {field.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex rounded bg-muted/40 px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                        {field.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {field.required ? (
                        <span className="inline-flex size-4 items-center justify-center rounded bg-foreground/20 text-xs font-bold text-foreground">
                          ✓
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="line-clamp-2 text-xs text-muted-foreground">{field.description}</p>
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
        <div className="space-y-2.5 border-t border-border/40 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Связанные настройки</p>
          <div className="flex flex-col gap-2">
            {reference.relatedSettings.map((related, idx) => {
              const relatedRef = SETTINGS_REFERENCES[related.sectionId];
              return (
                <button
                  key={idx}
                  onClick={() => onNavigate?.(related.sectionId)}
                  className={cn(
                    'rounded-md border border-border/50 px-3 py-2 text-left text-xs transition-colors',
                    'hover:bg-muted/60 hover:border-border/60 active:bg-muted/80'
                  )}
                >
                  <p className="font-medium text-foreground">{relatedRef?.title || related.sectionId}</p>
                  <p className="text-xs text-muted-foreground">{related.reason}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional functions */}
      {reference.additionalFunctions.length > 0 && (
        <div className="space-y-2.5 border-t border-border/40 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Дополнительные функции</p>
          <div className="flex flex-col gap-1.5">
            {reference.additionalFunctions.map((func, idx) => {
              const isExpanded = expandedFunctions.has(idx);
              return (
                <div
                  key={idx}
                  className={cn(
                    'overflow-hidden rounded-md border border-border/40 transition-all',
                    isExpanded ? 'bg-muted/30' : 'bg-muted/15'
                  )}
                >
                  <button
                    onClick={() => toggleFunction(idx)}
                    className={cn(
                      'w-full px-3 py-2 text-left transition-colors',
                      'hover:bg-muted/50 active:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{func.name}</p>
                      <ChevronDown
                        className={cn('size-4 shrink-0 text-muted-foreground transition-transform', {
                          'rotate-180': isExpanded,
                        })}
                        aria-hidden
                      />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 border-t border-border/40 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">{func.description}</p>
                      <div className="rounded bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground italic">
                        {func.example}
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
