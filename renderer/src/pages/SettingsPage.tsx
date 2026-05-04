import { useEffect, useMemo, useState } from 'react';
import { AppSettingsTechnicalCard } from '@/features/app-settings/AppSettingsTechnicalCard';
import { AppGuidePanel } from '@/features/settings/AppGuidePanel';
import { AppearanceSettingsCard } from '@/features/settings/AppearanceSettingsCard';
import { CfgSectionCard } from '@/features/settings/CfgSectionCard';
import { SettingsReferenceBlock } from '@/features/settings/SettingsReferenceBlock';
import { getSettingsReference } from '@/features/settings/settings-references';
import { NutritionTargetsSettingsCard } from '@/features/settings/NutritionTargetsSettingsCard';
import { getCfgSectionSpec } from '@/features/settings/cfg-section-specs';
import { SETTINGS_NAV_GROUPS, flattenSettingsNav } from '@/features/settings/settings-nav-model';
import { SettingsTabActionsProvider } from '@/features/settings/settings-tab-actions-context';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const reference = useMemo(() => getSettingsReference(active), [active]);

  const panel = (() => {
    if (active === 'app-guide') {
      return <AppGuidePanel />;
    }
    if (active === 'interface-data') {
      return (
        <div className="flex flex-col gap-4 sm:gap-5">
          <AppearanceSettingsCard />
          <NutritionTargetsSettingsCard />
          <AppSettingsTechnicalCard />
        </div>
      );
    }
    if (active === 'diary-categories') {
      const s = getCfgSectionSpec('diary-categories');
      return s ? <CfgSectionCard spec={s} /> : null;
    }
    if (active === 'nutrition-products') {
      const s = getCfgSectionSpec('nutrition-products');
      return s ? <CfgSectionCard spec={s} /> : null;
    }
    if (active === 'nutrition-presets') {
      const s = getCfgSectionSpec('nutrition-presets');
      return s ? <CfgSectionCard spec={s} /> : null;
    }
    const spec = getCfgSectionSpec(active);
    if (spec) return <CfgSectionCard spec={spec} />;
    return null;
  })();

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={MEGA_SHELL_CONTENT_CN}>
          <div className="grid h-full min-h-0 flex-1 grid-cols-1 divide-y divide-border/60 overflow-hidden aura-content-fade-in lg:grid-cols-[minmax(13.5rem,16rem)_minmax(0,1fr)] lg:divide-x lg:divide-y-0 xl:grid-cols-[minmax(14.5rem,17rem)_minmax(0,1fr)]">
            <aside className="bg-muted/15 hidden min-h-0 flex-col overflow-hidden border-border/40 lg:flex">
              <MegaPanelHeader title="Разделы" />
              <ScrollArea className="h-full min-h-0">
                <nav className="flex flex-col gap-0.5 px-1 pt-1 pb-1.5 sm:px-1.5 sm:pt-1.5 sm:pb-2" aria-label="Разделы настроек">
                  {SETTINGS_NAV_GROUPS.map((group, gIdx) => (
                    <div key={group.id} className="flex flex-col gap-0.5">
                      <p className="text-muted-foreground px-2 pt-1 pb-0 text-xs font-semibold uppercase tracking-wider sm:pt-1.5">
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
                              iconNode={
                                taskIconName ? (
                                  <AuraThemedIcon
                                    name={taskIconName}
                                    className="size-3.5 shrink-0"
                                    tint={isActive ? 'currentColor' : 'var(--muted-foreground)'}
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

            <section className="bg-card/30 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {activeItem ? (
                <SettingsTabActionsProvider>
                  {(rightSlot) => (
                    <>
                      <div className="px-2 pb-1 pt-1.5 lg:hidden">
                        <Select value={active} onValueChange={setActive}>
                          <SelectTrigger className="h-9 w-full bg-background/85">
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
                            {SETTINGS_NAV_GROUPS.map((group) =>
                              group.items.map((item) => {
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
                              })
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <MegaPanelHeader
                        title={displayTitle(activeItem.id, activeItem.title)}
                        right={rightSlot ? <div className="flex shrink-0 items-center gap-2">{rightSlot}</div> : null}
                      />
                      <div className={MEGA_PANEL_BODY_CN}>
                        <ScrollArea className="min-h-0 flex-1">
                          <div
                            key={active}
                            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.99] motion-safe:duration-200 motion-safe:ease-out motion-reduce:animate-none flex flex-col gap-3 pr-1 sm:gap-6 sm:pr-2"
                          >
                            {panel}
                            {reference ? (
                              <SettingsReferenceBlock reference={reference} onNavigate={setActive} />
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
