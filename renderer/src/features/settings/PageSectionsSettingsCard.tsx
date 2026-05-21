import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Apple,
  BookOpen,
  ChartPie,
  CheckSquare,
  CreditCard,
  FileText,
  Flame,
  History,
  Home,
  ListChecks,
  ListTodo,
  Medal,
  PenLine,
  Scroll,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { cn } from '@/lib/utils';
import {
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

type VisibilityItem = {
  id: string;
  label: string;
  Icon: LucideIcon;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

type VisibilityPage = {
  title: string;
  Icon: LucideIcon;
  items: VisibilityItem[];
};

function VisibilityChip({ item }: { item: VisibilityItem }) {
  const Icon = item.Icon;
  return (
    <button
      type="button"
      disabled={item.disabled}
      aria-pressed={item.checked}
      onClick={() => !item.disabled && item.onChange(!item.checked)}
      className={cn(
        'inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium aura-tx-colors outline-none active:scale-[0.97]',
        'focus-visible:ring-2 focus-visible:ring-ring/60',
        item.checked
          ? 'border-primary/25 bg-primary/10 text-foreground'
          : 'border-[var(--aura-border-soft)] bg-transparent text-[var(--aura-text-subtle)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground',
        item.disabled && 'cursor-not-allowed opacity-35 pointer-events-none',
      )}
    >
      <Icon
        className={cn('size-3.5 shrink-0', item.checked ? 'text-primary' : 'opacity-40')}
        aria-hidden
      />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function PageVisibilityRow({ page }: { page: VisibilityPage }) {
  return (
    <section className="grid min-w-0 grid-cols-1 gap-2 border-t border-[var(--aura-border-soft)] py-3 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[7rem_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-2">
        <page.Icon className="size-3.5 shrink-0 text-[var(--aura-text-muted)]" aria-hidden />
        <p className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.13em] text-[var(--aura-text-muted)]">{page.title}</p>
      </div>
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {page.items.map((item) => <VisibilityChip key={item.id} item={item} />)}
      </div>
    </section>
  );
}

type PageSectionsSettingsCardProps = {
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
      setVis(next);
      if (db) mergeSave(db, next);
      window.dispatchEvent(new Event('settings-saved'));
      onSaved?.();
    },
    [db, onSaved]
  );

  const pages = useMemo<VisibilityPage[]>(() => [
    {
      title: 'Главная',
      Icon: Home,
      items: [
        { id: 'page-vis-home-tasksCategories',      Icon: CheckSquare, label: 'Категории задач',    checked: vis.home.tasksCategories,        onChange: (v) => patch({ ...vis, home: { ...vis.home, tasksCategories: v } }) },
        { id: 'page-vis-home-dailyPlans',            Icon: ListTodo,    label: 'Планы на день',      checked: vis.home.dailyPlans,              onChange: (v) => patch({ ...vis, home: { ...vis.home, dailyPlans: v } }) },
        { id: 'page-vis-home-transactions',          Icon: CreditCard,  label: 'Финансы',            checked: vis.home.transactions,            onChange: (v) => patch({ ...vis, home: { ...vis.home, transactions: v } }) },
        { id: 'page-vis-home-categoryProgressChart', Icon: ChartPie,    label: 'Диаграмма прогресса', checked: vis.home.categoryProgressChart, onChange: (v) => patch({ ...vis, home: { ...vis.home, categoryProgressChart: v } }) },
      ],
    },
    {
      title: 'Дневник',
      Icon: BookOpen,
      items: [
        { id: 'page-vis-diary-entryPanel',       Icon: PenLine,  label: 'Панель ввода', checked: vis.diary.entryPanel,        onChange: (v) => patch({ ...vis, diary: { ...vis.diary, entryPanel: v } }) },
        { id: 'page-vis-diary-contentEntries',   Icon: FileText, label: 'Записи',       checked: vis.diary.contentEntries,   onChange: (v) => patch({ ...vis, diary: { ...vis.diary, contentEntries: v } }) },
        { id: 'page-vis-diary-contentNutrition', Icon: Apple,    label: 'Питание',      checked: vis.diary.contentNutrition, onChange: (v) => patch({ ...vis, diary: { ...vis.diary, contentNutrition: v } }) },
      ],
    },
    {
      title: 'Ритуалы',
      Icon: Flame,
      items: [
        { id: 'page-vis-rituals-rituals', Icon: ListChecks, label: 'Чек-лист', checked: vis.rituals.rituals, onChange: (v) => patch({ ...vis, rituals: { ...vis.rituals, rituals: v } }) },
        { id: 'page-vis-rituals-vows',    Icon: Scroll,     label: 'Обеты',    checked: vis.rituals.vows,    onChange: (v) => patch({ ...vis, rituals: { ...vis.rituals, vows: v } }) },
        { id: 'page-vis-rituals-goals',   Icon: Target,     label: 'Цели',     checked: vis.rituals.goals,   onChange: (v) => patch({ ...vis, rituals: { ...vis.rituals, goals: v } }) },
      ],
    },
    {
      title: 'Ранги',
      Icon: Trophy,
      items: [
        { id: 'page-vis-ranks-rank',          Icon: Medal,   label: 'Ранг и путь',   checked: vis.ranks.rank,          onChange: (v) => patch({ ...vis, ranks: { ...vis.ranks, rank: v } }) },
        { id: 'page-vis-ranks-pointsHistory', Icon: History, label: 'История очков', checked: vis.ranks.pointsHistory, onChange: (v) => patch({ ...vis, ranks: { ...vis.ranks, pointsHistory: v } }) },
      ],
    },
  ], [patch, vis]);

  if (!ready || !db) return <p className="text-sm text-muted-foreground">Загрузка…</p>;

  return (
    <SettingsSectionCard title="Секции страниц" leadingIcon={Home} contentClassName="gap-0">
      <div className="flex flex-col">
        {pages.map((page) => <PageVisibilityRow key={page.title} page={page} />)}
      </div>
    </SettingsSectionCard>
  );
}
