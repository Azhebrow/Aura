import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Database, Music, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ActAffixValueField } from '@/features/act/ActModal';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

function mergeSave(db: AuraDatabase, patch: AuraRow) {
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  const id = String(cur.id ?? 'app_settings_1');
  db.saveAppSettings({ ...cur, id, ...patch });
  window.dispatchEvent(new Event('settings-saved'));
}

function asBool01(v: unknown): boolean {
  return v === true || v === 1 || v === '1';
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
  const [devtoolsTab, setDevtoolsTab] = useState(false);
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
    setDevtoolsTab(asBool01(cur.devtools_tab_enabled));
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
        <SettingsSectionCard title="Деньги и очки" leadingIcon={Wallet} contentClassName="gap-0 p-0">
          <div className="grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex flex-col gap-1.5 px-3 py-2.5">
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

            <div className="flex flex-col gap-1.5 px-3 py-2.5">
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

            <div className="flex flex-col gap-1.5 px-3 py-2.5">
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
          </div>
        </SettingsSectionCard>
      </SettingsReveal>

      <SettingsReveal step={1}>
        <SettingsSectionCard title="Фон по умолчанию" leadingIcon={Music} contentClassName="gap-0 p-0">
          <div className="grid grid-cols-1 divide-y divide-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex flex-col gap-1.5 px-3 py-2.5">
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
            <div className="flex flex-col gap-1.5 px-3 py-2.5">
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
            <div className="flex flex-col gap-1.5 px-3 py-2.5">
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

      <SettingsReveal step={2}>
        <PageSectionsSettingsCard onSaved={bumpRow} />
      </SettingsReveal>

      <SettingsReveal step={3}>
        <SettingsSectionCard title="База данных" leadingIcon={Database} contentClassName="p-3">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/15 px-3 py-2">
              <Button type="button" variant="outline" onClick={() => setDatabaseDialogOpen(true)}>
                <Database className="size-3.5" />
                Открыть панель
              </Button>
            </div>
            <div className="border-border/60 flex items-center justify-between gap-3 rounded-lg border bg-muted/10 px-3 py-2.5">
              <div className="min-w-0 pr-2">
                <p className="text-sm font-medium leading-snug">Вкладка разработчика</p>
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
          </div>
          <DatabaseManagementDialog db={db} open={databaseDialogOpen} onOpenChange={setDatabaseDialogOpen} />
        </SettingsSectionCard>
      </SettingsReveal>
    </div>
  );
}
