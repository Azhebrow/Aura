import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppGuidePanel } from '@/features/settings/AppGuidePanel';
import { CfgSectionCard } from '@/features/settings/CfgSectionCard';
import { InterfaceDataSettingsPanel } from '@/features/settings/InterfaceDataSettingsPanel';
import { SidebarWidgetSettingsCard } from '@/features/settings/SidebarWidgetSettingsCard';
import { TimerBgSettingsCard } from '@/features/app-settings/AppSettingsTechnicalCard';
import { NutritionTargetsSettingsCard } from '@/features/settings/NutritionTargetsSettingsCard';
import { FinanceSettingsCard } from '@/features/settings/FinanceSettingsCard';
import { SettingsReferenceBlock } from '@/features/settings/SettingsReferenceBlock';
import { getSettingsReference } from '@/features/settings/settings-references';
import { getCfgSectionSpec } from '@/features/settings/cfg-section-specs';
import { translateCfgSectionSpec } from '@/features/settings/cfg-section-translator';
import type { CfgFieldDef, CfgSectionSpec } from '@/features/settings/cfg-section-types';
import { SETTINGS_NAV_GROUPS, flattenSettingsNav } from '@/features/settings/settings-nav-model';
import { SettingsTabActionsProvider } from '@/features/settings/settings-tab-actions-context';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_PANEL_BODY_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MegaPanelHeader } from '@/shared/ui/mega-panel-header';
import { ShellNavItem } from '@/widgets/app-chrome/ShellNavItem';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { PageFrame } from '@/widgets/page-frame/PageFrame';

const FLAT = flattenSettingsNav();
const VALID_IDS = new Set(FLAT.map((i) => i.id));
type TaskSettingsId = 'tasks-rituals' | 'tasks-time' | 'tasks-body' | 'tasks-deps';
type TaskNavMeta = { title?: string; icon?: string };

function settingsNavAccent(id: string): string {
  if (id === 'tasks-rituals') return 'var(--task-rituals)';
  if (id === 'tasks-time') return 'var(--task-time)';
  if (id === 'tasks-body') return 'var(--task-body)';
  if (id === 'tasks-deps') return 'var(--task-deps)';
  if (id === 'leisure-filling') return 'var(--leisure-filling)';
  if (id === 'leisure-escape') return 'var(--leisure-escape)';
  if (id === 'rituals-morning') return 'var(--rituals-morning)';
  if (id === 'rituals-evening') return 'var(--rituals-evening)';
  if (id === 'rituals-vows') return 'var(--rituals-vows)';
  if (id === 'finance-accounts') return 'var(--finance-transfer)';
  if (id === 'finance-income') return 'var(--finance-income)';
  if (id === 'finance-expense') return 'var(--finance-expense)';
  if (id === 'nutrition-products') return 'var(--nutrition-proteins)';
  if (id === 'nutrition-presets') return 'var(--nutrition-carbs)';
  if (id === 'ambient-music') return 'var(--ambient-music)';
  if (id === 'diary-categories' || id === 'diary-entry-presets') return 'var(--primary)';
  if (id === 'diary-moods') return 'var(--rituals-vows)';
  return 'var(--primary)';
}

function normalizeReferenceFieldName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()]/g, '')
    .trim();
}

function referenceFieldAliases(field: CfgFieldDef): string[] {
  const base = [field.label];
  switch (field.key) {
    case 'title':
    case 'name':
      return [...base, 'Название'];
    case 'icon':
      return [...base, 'Иконка', 'Иконка (имя файла)'];
    case 'level':
      return [...base, 'Порядок'];
    case 'task_type':
      return [...base, 'Тип задачи', 'Тип'];
    case 'config':
      return [...base, 'config (JSON для списка)'];
    case 'products':
      return [...base, 'Состав (JSON)'];
    case 'type':
      return [...base, 'Тип', 'Импульсивная покупка'];
    default:
      return base;
  }
}

function getEditableReferenceFieldNames(spec: CfgSectionSpec | undefined, t: ReturnType<typeof useTranslation>['t']): string[] | undefined {
  if (!spec) return undefined;
  const hidden = new Set(spec.hideFormKeys ?? []);
  const translated = translateCfgSectionSpec(spec, t);
  return translated.fields
    .filter((field) => field.key !== 'level' && !hidden.has(field.key))
    .flatMap(referenceFieldAliases)
    .map(normalizeReferenceFieldName);
}

function parseTaskNavMeta(raw: unknown): Partial<Record<TaskSettingsId, TaskNavMeta>> {
  const out: Partial<Record<TaskSettingsId, TaskNavMeta>> = {};
  try {
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!p || typeof p !== 'object') return out;
    const src = p as Record<string, { title?: string; icon?: string }>;
    const put = (id: TaskSettingsId, key: 'rituals' | 'time' | 'body' | 'deps') => {
      const entry = src[key];
      if (!entry || typeof entry !== 'object') return;
      const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : undefined;
      const icon = typeof entry.icon === 'string' && entry.icon.trim() ? entry.icon.trim() : undefined;
      if (title || icon) out[id] = { title, icon };
    };
    put('tasks-rituals', 'rituals');
    put('tasks-time', 'time');
    put('tasks-body', 'body');
    put('tasks-deps', 'deps');
  } catch {
    /* ignore */
  }
  return out;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState('interface-data');
  const { db, ready } = useAuraDb();
  const [taskMeta, setTaskMeta] = useState<Partial<Record<TaskSettingsId, TaskNavMeta>>>({});

  useEffect(() => {
    if (!ready || !db) return;
    const refresh = () => setTaskMeta(parseTaskNavMeta(db.getAppSettings()?.task_categories_config));
    refresh();
    window.addEventListener('task-categories-config-changed', refresh);
    return () => window.removeEventListener('task-categories-config-changed', refresh);
  }, [ready, db]);

  const displayTitle = (id: string, fallback: string) => {
    if (id === 'tasks-rituals') return taskMeta['tasks-rituals']?.title ?? fallback;
    if (id === 'tasks-time') return taskMeta['tasks-time']?.title ?? fallback;
    if (id === 'tasks-body') return taskMeta['tasks-body']?.title ?? fallback;
    if (id === 'tasks-deps') return taskMeta['tasks-deps']?.title ?? fallback;
    return fallback;
  };
  const displayTaskIconName = (id: string): string | null => {
    if (id === 'tasks-rituals') return taskMeta['tasks-rituals']?.icon ?? null;
    if (id === 'tasks-time') return taskMeta['tasks-time']?.icon ?? null;
    if (id === 'tasks-body') return taskMeta['tasks-body']?.icon ?? null;
    if (id === 'tasks-deps') return taskMeta['tasks-deps']?.icon ?? null;
    return null;
  };

  const activeItem = useMemo(() => FLAT.find((i) => i.id === active), [active]);
  const activeSelectItem = useMemo(() => FLAT.find((i) => i.id === active) ?? FLAT[0], [active]);
  const reference = useMemo(() => (active === 'interface-data' ? null : getSettingsReference(active)), [active]);
  const activeSpec = useMemo(() => getCfgSectionSpec(active), [active]);
  const referenceVisibleFieldNames = useMemo(
    () => getEditableReferenceFieldNames(activeSpec, t),
    [activeSpec, t]
  );

  const panel = (() => {
    if (active === 'app-guide') {
      return <AppGuidePanel />;
    }
    if (active === 'interface-data') {
      return <InterfaceDataSettingsPanel />;
    }
    if (active === 'sidebar-widget') {
      return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <SidebarWidgetSettingsCard />
        </div>
      );
    }
    if (active === 'finance-accounts') {
      const s = getCfgSectionSpec('finance-accounts');
      return (
        <div className="flex w-full min-w-0 flex-col gap-3">
          <FinanceSettingsCard />
          {s ? <CfgSectionCard spec={s} /> : null}
        </div>
      );
    }
    if (active === 'diary-categories') {
      const s = getCfgSectionSpec('diary-categories');
      return s ? <CfgSectionCard spec={s} /> : null;
    }
    if (active === 'nutrition-products') {
      const s = getCfgSectionSpec('nutrition-products');
      return (
        <div className="flex w-full min-w-0 flex-col gap-3">
          <NutritionTargetsSettingsCard />
          {s ? <CfgSectionCard spec={s} /> : null}
        </div>
      );
    }
    if (active === 'nutrition-presets') {
      const s = getCfgSectionSpec('nutrition-presets');
      return s ? <CfgSectionCard spec={s} /> : null;
    }
    if (active === 'ambient-music') {
      const s = getCfgSectionSpec('ambient-music');
      return (
        <div className="flex w-full min-w-0 flex-col gap-3">
          {s ? <CfgSectionCard spec={s} /> : null}
          <TimerBgSettingsCard />
        </div>
      );
    }
    const spec = getCfgSectionSpec(active);
    if (spec) return <CfgSectionCard spec={spec} />;
    return null;
  })();

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 divide-y divide-[var(--aura-border-soft)] overflow-hidden aura-content-fade-in lg:grid-cols-[minmax(11.5rem,13rem)_minmax(0,1fr)] lg:divide-x lg:divide-y-0 xl:grid-cols-[minmax(12rem,13.5rem)_minmax(0,1fr)]">
            <aside className="hidden min-h-0 flex-col overflow-hidden bg-transparent lg:flex">
              <MegaPanelHeader title="Разделы" />
              <ScrollArea className="h-full min-h-0">
                <nav className="flex flex-col gap-0.5 px-1 pt-1 pb-1.5" aria-label="Разделы настроек">
                  {SETTINGS_NAV_GROUPS.map((group, gIdx) => (
                    <div key={group.id} className="flex flex-col gap-0.5">
                      <p className="aura-label px-1.5 pt-1 pb-0 sm:pt-1.5">
                        {group.label}
                      </p>
                      <div className="flex flex-col gap-1 px-0.5">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isActive = active === item.id;
                          const taskIconName = displayTaskIconName(item.id);
                          return (
                            <ShellNavItem
                              key={item.id}
                              icon={Icon}
                              accentColor={settingsNavAccent(item.id)}
                              iconNode={
                                taskIconName ? (
                                  <AuraThemedIcon
                                    name={taskIconName}
                                    className="size-3.5 shrink-0"
                                    tint="currentColor"
                                  />
                                ) : undefined
                              }
                              isActive={isActive}
                              compact
                              onClick={() => VALID_IDS.has(item.id) && setActive(item.id)}
                            >
                              {displayTitle(item.id, item.title)}
                            </ShellNavItem>
                          );
                        })}
                      </div>
                      {gIdx < SETTINGS_NAV_GROUPS.length - 1 ? <Separator className="my-1.5 opacity-50" /> : null}
                    </div>
                  ))}
                </nav>
              </ScrollArea>
            </aside>

            <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--aura-surface-panel)]">
              {activeItem ? (
                <SettingsTabActionsProvider>
                  {(rightSlot) => (
                    <>
                      <div className="px-2 pb-1 pt-1.5 lg:hidden">
                        <Select value={active} onValueChange={setActive}>
                          <SelectTrigger className="h-9 w-full">
                            <SelectValue placeholder="Раздел настроек">
                              {activeSelectItem ? (
                                <span className="flex min-w-0 items-center gap-2">
                                  <activeSelectItem.icon className="size-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate">{displayTitle(activeSelectItem.id, activeSelectItem.title)}</span>
                                </span>
                              ) : null}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {SETTINGS_NAV_GROUPS.map((group) => (
                              <SelectGroup key={group.id}>
                                <SelectLabel>{group.label}</SelectLabel>
                                {group.items.map((item) => {
                                  const taskIconName = displayTaskIconName(item.id);
                                  return (
                                    <SelectItem key={item.id} value={item.id}>
                                      <span className="flex min-w-0 items-center gap-2">
                                        {taskIconName ? (
                                          <AuraThemedIcon name={taskIconName} className="size-4 shrink-0" />
                                        ) : (
                                          <item.icon className="size-4 shrink-0 text-muted-foreground" />
                                        )}
                                        <span className="truncate">{displayTitle(item.id, item.title)}</span>
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <MegaPanelHeader
                        title={displayTitle(activeItem.id, activeItem.title)}
                        right={rightSlot ? <div className="flex shrink-0 items-center gap-2">{rightSlot}</div> : null}
                      />
                      <div className={MEGA_PANEL_BODY_CN}>
                        <ScrollArea className="w-full min-h-0 min-w-0 flex-1">
                          <div
                            key={active}
                            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.99] motion-safe:duration-200 motion-safe:ease-out motion-reduce:animate-none flex w-full min-w-0 flex-col gap-3 pr-1 sm:gap-6 sm:pr-2"
                          >
                            <div className="w-full min-w-0">{panel}</div>
                            {reference ? (
                              <div className="min-w-0">
                                <SettingsReferenceBlock
                                  reference={reference}
                                  onNavigate={setActive}
                                  visibleFieldNames={referenceVisibleFieldNames}
                                />
                              </div>
                            ) : null}
                          </div>
                        </ScrollArea>
                      </div>
                    </>
                  )}
                </SettingsTabActionsProvider>
              ) : null}
            </section>
          </div>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
