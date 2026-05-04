import { useCallback, useEffect, useState } from 'react';
import { Home } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import {
  enforceVisibilityInvariants,
  parsePageSectionsVisibility,
  type PageSectionsVisibility,
} from '@/shared/lib/page-sections-visibility';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';

function mergeSave(db: AuraDatabase, vis: PageSectionsVisibility) {
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  const id = String(cur.id ?? 'app_settings_1');
  db.saveAppSettings({
    ...cur,
    id,
    page_sections_visibility: JSON.stringify(vis),
  });
}

type VisibilityRowProps = {
  rowId: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (v: boolean) => void;
};

function VisibilityRow({ rowId, label, checked, disabled, onCheckedChange }: VisibilityRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5">
      <Label
        htmlFor={rowId}
        className={`text-xs font-medium leading-snug ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        {label}
      </Label>
      <Switch
        id={rowId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(v) => {
          if (!disabled) onCheckedChange(v);
        }}
        aria-label={label}
      />
    </div>
  );
}

type PageSectionsSettingsCardProps = {
  /** После сохранения в БД (например обновить снимок настроек в родителе). */
  onSaved?: () => void;
};

export function PageSectionsSettingsCard(props: PageSectionsSettingsCardProps = {}) {
  const { onSaved } = props;
  const { db, ready } = useAuraDb();
  const [vis, setVis] = useState<PageSectionsVisibility>(() => parsePageSectionsVisibility(null));

  const reload = useCallback(() => {
    if (!db) return;
    const cur = db.getAppSettings() as AuraRow | null;
    setVis(parsePageSectionsVisibility(cur?.page_sections_visibility));
  }, [db]);

  useEffect(() => {
    if (!ready) return;
    reload();
  }, [ready, reload]);

  const patch = useCallback(
    (next: PageSectionsVisibility) => {
      const fixed = enforceVisibilityInvariants(JSON.parse(JSON.stringify(next)) as PageSectionsVisibility);
      setVis(fixed);
      if (db) mergeSave(db, fixed);
      window.dispatchEvent(new Event('settings-saved'));
      onSaved?.();
    },
    [db, onSaved]
  );

  const diaryEntriesLocked = vis.diary.contentEntries && !vis.diary.contentNutrition;
  const diaryNutritionLocked = vis.diary.contentNutrition && !vis.diary.contentEntries;
  const ranksRankLocked = vis.ranks.rank && !vis.ranks.pointsHistory;
  const ranksHistoryLocked = vis.ranks.pointsHistory && !vis.ranks.rank;

  if (!ready || !db) {
    return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  }

  return (
    <SettingsSectionCard
      title="Секции страниц"
      leadingIcon={Home}
      contentClassName="p-0"
    >
      <div className="overflow-hidden rounded-lg border border-border/70">
        <table className="w-full border-collapse text-sm">
          <tbody className="divide-y divide-border/70">
            <tr className="bg-muted/25">
              <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Главная</td>
              <td className="px-3 py-1.5">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <VisibilityRow rowId="page-vis-home-tasksCategories" label="Категории задач" checked={vis.home.tasksCategories} onCheckedChange={(v) => patch({ ...vis, home: { ...vis.home, tasksCategories: v } })} />
                  <VisibilityRow rowId="page-vis-home-dailyPlans" label="Планы на день" checked={vis.home.dailyPlans} onCheckedChange={(v) => patch({ ...vis, home: { ...vis.home, dailyPlans: v } })} />
                  <VisibilityRow rowId="page-vis-home-transactions" label="Финансы" checked={vis.home.transactions} onCheckedChange={(v) => patch({ ...vis, home: { ...vis.home, transactions: v } })} />
                  <VisibilityRow rowId="page-vis-home-categoryProgressChart" label="Диаграмма прогресса" checked={vis.home.categoryProgressChart} onCheckedChange={(v) => patch({ ...vis, home: { ...vis.home, categoryProgressChart: v } })} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-muted/25 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Дневник</td>
              <td className="px-3 py-1.5">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <VisibilityRow rowId="page-vis-diary-entryPanel" label="Панель ввода записи" checked={vis.diary.entryPanel} onCheckedChange={(v) => patch({ ...vis, diary: { ...vis.diary, entryPanel: v } })} />
                  <VisibilityRow
                    rowId="page-vis-diary-contentEntries"
                    label="Вкладка «Записи»"
                    checked={vis.diary.contentEntries}
                    disabled={diaryEntriesLocked}
                    onCheckedChange={(v) => {
                      if (!v && !vis.diary.contentNutrition) return;
                      patch({ ...vis, diary: { ...vis.diary, contentEntries: v } });
                    }}
                  />
                  <VisibilityRow
                    rowId="page-vis-diary-contentNutrition"
                    label="Вкладка «Питание»"
                    checked={vis.diary.contentNutrition}
                    disabled={diaryNutritionLocked}
                    onCheckedChange={(v) => {
                      if (!v && !vis.diary.contentEntries) return;
                      patch({ ...vis, diary: { ...vis.diary, contentNutrition: v } });
                    }}
                  />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-muted/25 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ритуалы</td>
              <td className="px-3 py-1.5">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <VisibilityRow rowId="page-vis-rituals-rituals" label="Чек-лист ритуалов" checked={vis.rituals.rituals} onCheckedChange={(v) => patch({ ...vis, rituals: { ...vis.rituals, rituals: v } })} />
                  <VisibilityRow rowId="page-vis-rituals-vows" label="Обеты" checked={vis.rituals.vows} onCheckedChange={(v) => patch({ ...vis, rituals: { ...vis.rituals, vows: v } })} />
                  <VisibilityRow rowId="page-vis-rituals-goals" label="Цели" checked={vis.rituals.goals} onCheckedChange={(v) => patch({ ...vis, rituals: { ...vis.rituals, goals: v } })} />
                </div>
              </td>
            </tr>
            <tr>
              <td className="bg-muted/25 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ранги</td>
              <td className="px-3 py-1.5">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  <VisibilityRow
                    rowId="page-vis-ranks-rank"
                    label="Ранг и путь"
                    checked={vis.ranks.rank}
                    disabled={ranksRankLocked}
                    onCheckedChange={(v) => {
                      if (!v && !vis.ranks.pointsHistory) return;
                      patch({ ...vis, ranks: { ...vis.ranks, rank: v } });
                    }}
                  />
                  <VisibilityRow
                    rowId="page-vis-ranks-pointsHistory"
                    label="История очков"
                    checked={vis.ranks.pointsHistory}
                    disabled={ranksHistoryLocked}
                    onCheckedChange={(v) => {
                      if (!v && !vis.ranks.rank) return;
                      patch({ ...vis, ranks: { ...vis.ranks, pointsHistory: v } });
                    }}
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SettingsSectionCard>
  );
}
