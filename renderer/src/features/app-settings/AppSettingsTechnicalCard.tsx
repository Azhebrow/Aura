import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Database, LayoutTemplate, Music, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActAffixValueField } from '@/features/act/ActModal';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PageSectionsSettingsCard } from '@/features/settings/PageSectionsSettingsCard';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';
import { DatabaseManagementDialog } from '@/features/app-settings/DatabaseManagementDialog';

const CURRENCY_OPTIONS = [
  { value: 'RUB', label: 'Российский рубль (₽)' },
  { value: 'USD', label: 'Доллар США ($)' },
  { value: 'EUR', label: 'Евро (€)' },
  { value: 'GBP', label: 'Фунт стерлингов (£)' },
  { value: 'JPY', label: 'Японская иена (¥)' },
  { value: 'CNY', label: 'Китайский юань (¥)' },
  { value: 'KZT', label: 'Казахстанский тенге (₸)' },
  { value: 'BYN', label: 'Белорусский рубль (Br)' },
  { value: 'PLN', label: 'Польский злотый (zł)' },
] as const;

const APP_SCALE_OPTIONS = ['0.85', '0.9', '1', '1.1', '1.15', '1.25'] as const;

function mergeSave(db: AuraDatabase, patch: AuraRow) {
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  const id = String(cur.id ?? 'app_settings_1');
  db.saveAppSettings({ ...cur, id, ...patch });
}

function asBool01(v: unknown): boolean {
  return v === true || v === 1 || v === '1';
}

function dispatchTaskCategoriesRefresh() {
  window.dispatchEvent(new CustomEvent('task-categories-config-changed'));
}

const REVEAL_STAGGER_MS = 36;

function safeGetAmbientRows(db: AuraDatabase): AuraRow[] {
  try {
    return db
      .getAll('cfg_ambient_music')
      .slice()
      .sort((a, b) =>
        String(a.name ?? a.title ?? a.id ?? '').localeCompare(String(b.name ?? b.title ?? b.id ?? ''), 'ru')
      );
  } catch (error) {
    console.warn('[Settings] Failed to load ambient music rows:', error);
    return [];
  }
}

/** Мягкое появление секций без сдвига по вертикали. */
function SettingsReveal({ step, children }: { step: number; children: ReactNode }) {
  return (
    <div
      className="opacity-100 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-[0.985] motion-safe:duration-300 motion-safe:ease-out motion-safe:[animation-fill-mode:both] motion-reduce:animate-none"
      style={{ animationDelay: `${step * REVEAL_STAGGER_MS}ms` }}
    >
      {children}
    </div>
  );
}

export function AppSettingsTechnicalCard() {
  const { db, ready } = useAuraDb();
  const [currency, setCurrency] = useState('RUB');
  const [pointsStartDate, setPointsStartDate] = useState('');
  const [pointsOpenHours, setPointsOpenHours] = useState(168);
  const [bottomNavLabels, setBottomNavLabels] = useState(false);
  const [devtoolsTab, setDevtoolsTab] = useState(false);
  const [hideTaskPercent, setHideTaskPercent] = useState(false);
  const [categoryPercentHighlight, setCategoryPercentHighlight] = useState(false);
  const [appScale, setAppScale] = useState('1');
  const [ambientRows, setAmbientRows] = useState<AuraRow[]>([]);
  const [ambientDefaultTimer, setAmbientDefaultTimer] = useState('');
  const [ambientDefaultStopwatch, setAmbientDefaultStopwatch] = useState('');
  const [ambientDefaultBreak, setAmbientDefaultBreak] = useState('');
  const [databaseDialogOpen, setDatabaseDialogOpen] = useState(false);

  const reload = useCallback(() => {
    if (!db) return;
    let cur: AuraRow = {};
    try {
      cur = (db.getAppSettings() ?? {}) as AuraRow;
    } catch (error) {
      console.warn('[Settings] Failed to load app settings row:', error);
    }
    setCurrency(typeof cur.currency === 'string' && cur.currency ? cur.currency : 'RUB');
    const start =
      typeof cur.points_start_date === 'string' && cur.points_start_date
        ? cur.points_start_date.slice(0, 10)
        : typeof cur.created_at === 'string' && cur.created_at
          ? cur.created_at.slice(0, 10)
          : '';
    setPointsStartDate(start);
    const poh = Number(cur.points_open_hours);
    setPointsOpenHours(Number.isFinite(poh) && poh > 0 ? Math.min(168, Math.floor(poh)) : 168);
    setBottomNavLabels(asBool01(cur.bottom_nav_show_labels));
    setDevtoolsTab(asBool01(cur.devtools_tab_enabled));
    setHideTaskPercent(asBool01(cur.tasks_hide_completion_percent));
    setCategoryPercentHighlight(asBool01(cur.category_percent_highlight_enabled));
    const sc = cur.app_scale != null && cur.app_scale !== '' ? String(cur.app_scale) : '1';
    setAppScale(APP_SCALE_OPTIONS.includes(sc as (typeof APP_SCALE_OPTIONS)[number]) ? sc : '1');
    setAmbientRows(safeGetAmbientRows(db));
    setAmbientDefaultTimer(cur.ambient_default_timer != null ? String(cur.ambient_default_timer) : '');
    setAmbientDefaultStopwatch(cur.ambient_default_stopwatch != null ? String(cur.ambient_default_stopwatch) : '');
    setAmbientDefaultBreak(cur.ambient_default_break != null ? String(cur.ambient_default_break) : '');
  }, [db]);

  useEffect(() => {
    if (!ready || !db) return;
    reload();
  }, [ready, db, reload]);

  const bumpRow = useCallback(() => {}, []);

  if (!ready || !db) {
    return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsReveal step={0}>
        <SettingsSectionCard
          title="Деньги, очки и масштаб"
          leadingIcon={Wallet}
          contentClassName="gap-0 p-0"
        >
          <div className="divide-border grid divide-y sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col gap-1 px-3 py-2">
            <Label htmlFor="settings-currency" className="text-xs font-medium">
              Валюта
            </Label>
            <Select
              value={currency}
              onValueChange={(v) => {
                setCurrency(v);
                mergeSave(db, { currency: v });
                bumpRow();
              }}
            >
              <SelectTrigger id="settings-currency" contentAlign="start" className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 px-3 py-2">
            <Label htmlFor="points-start" className="text-xs font-medium">
              Старт очков
            </Label>
            <Input
              id="points-start"
              type="date"
              className="h-8 text-xs"
              value={pointsStartDate}
              onChange={(e) => {
                const v = e.target.value;
                setPointsStartDate(v);
                mergeSave(db, { points_start_date: v });
                bumpRow();
              }}
            />
          </div>
          <div className="flex flex-col gap-1 px-3 py-2">
            <Label htmlFor="points-hours" className="text-xs font-medium">
              Окно (ч)
            </Label>
            <ActAffixValueField
              id="points-hours"
              suffix="ч"
              value={String(pointsOpenHours)}
              inputKind="integer"
              ariaLabel="Окно в часах"
              onCommit={(next) => {
                const n = Math.min(168, Math.max(1, Math.floor(Number(next) || 1)));
                setPointsOpenHours(n);
                mergeSave(db, { points_open_hours: n });
                bumpRow();
              }}
            />
          </div>
          <div className="flex flex-col gap-1 px-3 py-2">
            <Label htmlFor="settings-app-scale" className="text-xs font-medium">
              Масштаб UI
            </Label>
            <Select
              value={appScale}
              onValueChange={(v) => {
                setAppScale(v);
                mergeSave(db, { app_scale: v });
                bumpRow();
              }}
            >
              <SelectTrigger id="settings-app-scale" contentAlign="start" className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APP_SCALE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s === '1' ? '1 — по умолчанию' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        </SettingsSectionCard>
      </SettingsReveal>

      <SettingsReveal step={1}>
        <SettingsSectionCard
          title="Интерфейс и задачи"
          leadingIcon={LayoutTemplate}
          contentClassName="gap-0 divide-y divide-border/70 p-0"
        >
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-medium leading-snug">Подписи у нижних вкладок</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-snug">Текст под иконками навигации.</p>
            </div>
            <Switch
              className="shrink-0"
              checked={bottomNavLabels}
              onCheckedChange={(on) => {
                setBottomNavLabels(on);
                mergeSave(db, { bottom_nav_show_labels: on ? 1 : 0 });
                bumpRow();
                window.dispatchEvent(new CustomEvent('bottomNavDisplayChanged', { detail: { showLabels: on } }));
              }}
              aria-label="Подписи у нижних вкладок"
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-medium leading-snug">Вкладка разработчика</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-snug">Если сборка её показывает.</p>
            </div>
            <Switch
              className="shrink-0"
              checked={devtoolsTab}
              onCheckedChange={(on) => {
                setDevtoolsTab(on);
                mergeSave(db, { devtools_tab_enabled: on ? 1 : 0 });
                bumpRow();
                window.dispatchEvent(new CustomEvent('devtoolsTabEnabledChanged', { detail: { enabled: on } }));
              }}
              aria-label="Вкладка разработчика"
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-medium leading-snug">Скрыть % выполнения задач</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-snug">На главной в сетке категорий.</p>
            </div>
            <Switch
              className="shrink-0"
              checked={hideTaskPercent}
              onCheckedChange={(on) => {
                setHideTaskPercent(on);
                mergeSave(db, { tasks_hide_completion_percent: on ? 1 : 0 });
                bumpRow();
                dispatchTaskCategoriesRefresh();
              }}
              aria-label="Скрыть процент выполнения задач"
            />
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0 pr-2">
              <p className="text-sm font-medium leading-snug">Подсветка % по категории</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-snug">Акцент на доле выполнения.</p>
            </div>
            <Switch
              className="shrink-0"
              checked={categoryPercentHighlight}
              onCheckedChange={(on) => {
                setCategoryPercentHighlight(on);
                mergeSave(db, { category_percent_highlight_enabled: on ? 1 : 0 });
                bumpRow();
                dispatchTaskCategoriesRefresh();
              }}
              aria-label="Подсветка процента по категории"
            />
          </div>
        </SettingsSectionCard>
      </SettingsReveal>

      <SettingsReveal step={2}>
        <SettingsSectionCard
          title="Фон по умолчанию"
          description="Треки для таймера, секундомера и перерыва"
          leadingIcon={Music}
          contentClassName="gap-0 p-0"
        >
          <div className="divide-border grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex flex-col gap-1 px-3 py-2">
            <Label htmlFor="ambient-default-timer" className="text-xs font-medium">
              Таймер
            </Label>
            <Select
              value={ambientDefaultTimer || '__none__'}
              onValueChange={(v) => {
                const next = v === '__none__' ? '' : v;
                setAmbientDefaultTimer(next);
                mergeSave(db, { ambient_default_timer: next || null });
                bumpRow();
              }}
            >
              <SelectTrigger id="ambient-default-timer" contentAlign="start" className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">
                  Не задано
                </SelectItem>
                {ambientRows.map((r) => (
                  <SelectItem key={String(r.id)} value={String(r.id)} className="text-xs">
                    {String(r.name ?? r.title ?? r.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 px-3 py-2">
            <Label htmlFor="ambient-default-stopwatch" className="text-xs font-medium">
              Секундомер
            </Label>
            <Select
              value={ambientDefaultStopwatch || '__none__'}
              onValueChange={(v) => {
                const next = v === '__none__' ? '' : v;
                setAmbientDefaultStopwatch(next);
                mergeSave(db, { ambient_default_stopwatch: next || null });
                bumpRow();
              }}
            >
              <SelectTrigger id="ambient-default-stopwatch" contentAlign="start" className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">
                  Не задано
                </SelectItem>
                {ambientRows.map((r) => (
                  <SelectItem key={String(r.id)} value={String(r.id)} className="text-xs">
                    {String(r.name ?? r.title ?? r.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1 px-3 py-2">
            <Label htmlFor="ambient-default-break" className="text-xs font-medium">
              Перерыв
            </Label>
            <Select
              value={ambientDefaultBreak || '__none__'}
              onValueChange={(v) => {
                const next = v === '__none__' ? '' : v;
                setAmbientDefaultBreak(next);
                mergeSave(db, { ambient_default_break: next || null });
                bumpRow();
              }}
            >
              <SelectTrigger id="ambient-default-break" contentAlign="start" className="h-8 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">
                  Не задано
                </SelectItem>
                {ambientRows.map((r) => (
                  <SelectItem key={String(r.id)} value={String(r.id)} className="text-xs">
                    {String(r.name ?? r.title ?? r.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        </SettingsSectionCard>
      </SettingsReveal>

      <SettingsReveal step={3}>
        <PageSectionsSettingsCard onSaved={bumpRow} />
      </SettingsReveal>

      <SettingsReveal step={4}>
        <SettingsSectionCard
          title="База данных"
          description="Структура, резервные операции и обслуживание"
          leadingIcon={Database}
          contentClassName="p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/15 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">Панель управления базой AURA</p>
              <p className="text-muted-foreground text-xs">Экспорт, импорт, очистка, перезагрузка пресетов и статистика таблиц.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => setDatabaseDialogOpen(true)}>
              <Database className="size-3.5" />
              Открыть панель
            </Button>
          </div>
          <DatabaseManagementDialog db={db} open={databaseDialogOpen} onOpenChange={setDatabaseDialogOpen} />
        </SettingsSectionCard>
      </SettingsReveal>
    </div>
  );
}
