import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { useSettingsTabActions } from '@/features/settings/settings-tab-actions-context';
import type { AuraRow } from '@/types/aura';

/**
 * Настроения дневника: только просмотр. Редактирование и удаление отключены —
 * строки задаются данными приложения / миграциями.
 */
export function CfgDiaryMoodsCard() {
  const { db, ready } = useAuraDb();
  const setTabActions = useSettingsTabActions();
  const [rows, setRows] = useState<AuraRow[]>([]);

  const reload = useCallback(() => {
    if (!db) {
      setRows([]);
      return;
    }
    setRows(db.getAll('cfg_diary_moods').sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0)));
  }, [db]);

  useEffect(() => {
    if (!ready) return;
    reload();
  }, [ready, reload]);

  useLayoutEffect(() => {
    setTabActions(null);
    return () => setTabActions(null);
  }, [setTabActions]);

  return (
    <div className="flex flex-col gap-5">
      <div className="border-border/70 bg-muted/15 space-y-2 rounded-xl border px-4 py-3 text-xs leading-relaxed">
        <p className="text-muted-foreground">
          Шкала настроений для дневника: порядок и иконки задаются в данных приложения. Здесь только просмотр.
        </p>
      </div>
      {!ready ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title="Пока нет строк в cfg_diary_moods."
          hint="Проверьте сиды/миграции: список настроений формируется системными данными."
          compact
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div
              key={String(r.id)}
              className="border-border flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2 text-xs"
            >
              <AuraThemedIcon name={typeof r.icon === 'string' ? r.icon : null} className="size-7 shrink-0" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-foreground font-mono text-xs font-medium break-all">{String(r.id)}</span>
                <span className="text-muted-foreground text-xs">Уровень {String(r.level)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
