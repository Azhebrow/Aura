import type { SettingsReference } from '@/features/settings/references';
import { SETTINGS_REFERENCES } from '@/features/settings/references';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

function normalizeFieldName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .trim();
}

function CompactLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-faint">
      {children}
    </span>
  );
}

function MetaLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-1.5 py-3 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-3">
      <CompactLabel>{label}</CompactLabel>
      <div className="min-w-0 text-sm leading-relaxed text-subtle">{children}</div>
    </div>
  );
}

function fieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    checkbox: 'флаг',
    color: 'цвет',
    json: 'json',
    number: 'число',
    select: 'выбор',
    text: 'текст',
    textarea: 'текст',
  };
  return labels[type] ?? type;
}

export function SettingsReferenceBlock({
  reference,
  onNavigate,
  visibleFieldNames,
}: {
  reference: SettingsReference;
  onNavigate?: (sectionId: string) => void;
  visibleFieldNames?: readonly string[];
}) {
  const visibleFieldNameSet = visibleFieldNames ? new Set(visibleFieldNames.map(normalizeFieldName)) : null;
  const fields = visibleFieldNameSet
    ? reference.fields.filter((field) => visibleFieldNameSet.has(normalizeFieldName(field.name)))
    : reference.fields;
  const requiredCount = fields.filter((field) => field.required).length;
  const visibleImpacts = reference.impacts?.slice(0, 2) ?? [];
  const visibleAdditional = reference.additionalFunctions.slice(0, 1);

  return (
    <aside className="rounded-lg border border-soft/70 bg-panel/45 text-sm">
      <details className="group">
        <summary className="flex min-w-0 cursor-pointer list-none items-center gap-3 px-3 py-2.5 marker:hidden">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">{reference.title}</h3>
            <p className="mt-0.5 truncate text-xs leading-snug text-dim">
              {reference.definition}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-faint aura-tx-colors group-hover:text-subtle">
            Подробнее
            <ChevronDown className="size-3.5 transition-transform duration-150 group-open:rotate-180" aria-hidden />
          </span>
        </summary>

        <div className="border-t border-soft/70 px-3 pb-3">
          <div className="divide-y divide-soft/70">
            {reference.usedOn.length > 0 ? (
              <MetaLine label="Где">
                <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1.5">
                  {reference.usedOn.slice(0, 3).map((item, index) =>
                    item.isNavLink && item.sectionId ? (
                      <button
                        key={`${item.page}-${item.section}-${index}`}
                        type="button"
                        onClick={() => onNavigate?.(item.sectionId!)}
                        className="min-w-0 truncate text-left text-subtle aura-tx-colors hover:text-foreground"
                      >
                        {item.page} / {item.section}
                      </button>
                    ) : (
                      <span key={`${item.page}-${item.section}-${index}`} className="min-w-0 truncate">
                        {item.page} / {item.section}
                      </span>
                    )
                  )}
                </div>
              </MetaLine>
            ) : null}

            {fields.length > 0 ? (
              <MetaLine label="Поля">
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {fields.map((field) => (
                    <span
                      key={`${field.name}-${field.type}`}
                      title={field.description}
                      className={cn(
                        'inline-flex max-w-full items-center gap-1.5 rounded-md border border-soft/70 bg-background/25 px-2 py-1 text-xs leading-none text-subtle',
                        field.required && 'text-foreground'
                      )}
                    >
                      <span className="max-w-[11rem] truncate">{field.name}</span>
                      <span className="text-faint">{fieldTypeLabel(field.type)}</span>
                    </span>
                  ))}
                  {requiredCount > 0 ? (
                    <span className="inline-flex items-center px-1 text-xs leading-none text-faint">
                      {requiredCount} обяз.
                    </span>
                  ) : null}
                </div>
              </MetaLine>
            ) : null}

            {visibleImpacts.length > 0 ? (
              <MetaLine label="Влияет">
                <div className="space-y-1.5">
                  {visibleImpacts.map((impact, index) => (
                    <p key={`${impact.title}-${index}`} className="min-w-0">
                      <span className="font-medium text-foreground/80">{impact.title}</span>
                      <span className="text-faint"> · </span>
                      <span>{impact.description}</span>
                    </p>
                  ))}
                </div>
              </MetaLine>
            ) : null}

            {visibleAdditional.length > 0 ? (
              <MetaLine label="Зачем">
                {visibleAdditional.map((item, index) => (
                  <p key={`${item.name}-${index}`} className="min-w-0">
                    <span className="font-medium text-foreground/80">{item.name}</span>
                    <span className="text-faint"> · </span>
                    <span>{item.description}</span>
                  </p>
                ))}
              </MetaLine>
            ) : null}

            {reference.relatedSettings.length > 0 ? (
              <MetaLine label="Связано">
                <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                  {reference.relatedSettings.slice(0, 4).map((item, index) => {
                    const related = SETTINGS_REFERENCES[item.sectionId];
                    return (
                      <button
                        key={`${item.sectionId}-${index}`}
                        type="button"
                        title={item.reason}
                        onClick={() => onNavigate?.(item.sectionId)}
                        className="min-w-0 truncate text-left text-subtle aura-tx-colors hover:text-foreground"
                      >
                        {related?.title ?? item.sectionId}
                      </button>
                    );
                  })}
                </div>
              </MetaLine>
            ) : null}
          </div>
        </div>
      </details>
    </aside>
  );
}
