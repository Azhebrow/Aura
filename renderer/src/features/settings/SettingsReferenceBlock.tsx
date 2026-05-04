import { useState } from 'react';
import { ChevronDown, MapPin, Zap, Link2, Layers } from 'lucide-react';
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

  const handleNavClick = (sectionId: string) => {
    onNavigate?.(sectionId);
  };

  return (
    <div className="space-y-8">
      {/* Main info card */}
      <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 to-card/40 p-8">
        {/* Header */}
        <div className="flex items-start gap-5 mb-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/40">
            <reference.icon className="size-7 text-foreground" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold text-foreground mb-2">{reference.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{reference.definition}</p>
          </div>
        </div>
      </div>

      {/* Where it's used */}
      {reference.usedOn.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-blue-500/15">
              <MapPin className="size-4 text-blue-600" aria-hidden />
            </div>
            <h4 className="text-sm font-bold text-foreground">Где используется</h4>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {reference.usedOn.map((usage, idx) => {
              const isClickable = usage.isNavLink && usage.sectionId;
              return isClickable ? (
                <button
                  key={idx}
                  onClick={() => usage.sectionId && handleNavClick(usage.sectionId)}
                  className={cn(
                    'group rounded-lg border border-blue-500/20 bg-blue-50/5 px-4 py-3 text-left transition-all duration-200 cursor-pointer',
                    'hover:border-blue-500/40 hover:bg-blue-50/10 active:bg-blue-50/15'
                  )}
                >
                  <p className="text-xs font-bold text-blue-600 group-hover:text-blue-700 uppercase tracking-wide mb-1">
                    {usage.page}
                  </p>
                  <p className="text-sm font-medium text-foreground group-hover:text-foreground/90">
                    {usage.section}
                  </p>
                </button>
              ) : (
                <div
                  key={idx}
                  className="rounded-lg border border-blue-500/20 bg-blue-50/5 px-4 py-3 text-left"
                >
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">
                    {usage.page}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {usage.section}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Impacts */}
      {reference.impacts && reference.impacts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/15">
              <Zap className="size-4 text-amber-600" aria-hidden />
            </div>
            <h4 className="text-sm font-bold text-foreground">На что влияет</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reference.impacts.map((impact, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-amber-500/20 bg-amber-50/5 p-4"
              >
                <p className="text-sm font-semibold text-amber-700 mb-1">{impact.title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{impact.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fields */}
      {reference.fields.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-green-500/15">
              <Layers className="size-4 text-green-600" aria-hidden />
            </div>
            <h4 className="text-sm font-bold text-foreground">Структура полей</h4>
          </div>
          <div className="rounded-xl border border-border/20 overflow-hidden bg-card/40">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/20 bg-muted/20">
                    <th className="px-4 py-3 text-left font-bold text-foreground">Имя поля</th>
                    <th className="px-4 py-3 text-left font-bold text-foreground">Тип</th>
                    <th className="px-4 py-3 text-center font-bold text-foreground">Требуется</th>
                    <th className="px-4 py-3 text-left font-bold text-foreground">Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {reference.fields.map((field, idx) => (
                    <tr
                      key={idx}
                      className={cn(
                        'border-b border-border/10 transition-colors',
                        idx % 2 === 0 ? 'bg-muted/5' : 'bg-transparent'
                      )}
                    >
                      <td className="px-4 py-3">
                        <span className={cn('font-semibold', field.required ? 'text-foreground' : 'text-muted-foreground')}>
                          {field.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                          {getFieldTypeLabel(field.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {field.required ? (
                          <span className="inline-flex size-5 items-center justify-center rounded-md bg-green-500/20 text-xs font-bold text-green-700">
                            ✓
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {field.description}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Related settings */}
      {reference.relatedSettings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-8 rounded-lg bg-purple-500/15">
              <Link2 className="size-4 text-purple-600" aria-hidden />
            </div>
            <h4 className="text-sm font-bold text-foreground">Связанные разделы</h4>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reference.relatedSettings.map((related, idx) => {
              const relatedRef = SETTINGS_REFERENCES[related.sectionId];
              return (
                <button
                  key={idx}
                  onClick={() => handleNavClick(related.sectionId)}
                  className={cn(
                    'group rounded-lg border border-purple-500/20 bg-purple-50/5 p-4 text-left transition-all duration-200',
                    'hover:border-purple-500/40 hover:bg-purple-50/10 active:bg-purple-50/15'
                  )}
                >
                  <p className="text-sm font-bold text-purple-700 group-hover:text-purple-800 mb-1">
                    {relatedRef?.title || related.sectionId}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground group-hover:text-muted-foreground/90">
                    {related.reason}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Additional functions */}
      {reference.additionalFunctions.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-foreground">Дополнительные возможности</h4>
          <div className="flex flex-col gap-2">
            {reference.additionalFunctions.map((func, idx) => {
              const isExpanded = expandedFunctions.has(idx);
              return (
                <button
                  key={idx}
                  onClick={() => toggleFunction(idx)}
                  className={cn(
                    'rounded-lg border transition-all duration-200',
                    isExpanded
                      ? 'border-border/40 bg-muted/20'
                      : 'border-border/20 bg-muted/10 hover:bg-muted/15'
                  )}
                >
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground text-left">{func.name}</p>
                    <ChevronDown
                      className={cn('size-4 shrink-0 text-muted-foreground transition-transform', {
                        'rotate-180': isExpanded,
                      })}
                      aria-hidden
                    />
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/20 px-4 py-3 space-y-3 bg-muted/5">
                      <p className="text-sm leading-relaxed text-muted-foreground">{func.description}</p>
                      <div className="rounded-md border border-border/20 bg-muted/20 p-3">
                        <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wide mb-2">Пример</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">{func.example}</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
