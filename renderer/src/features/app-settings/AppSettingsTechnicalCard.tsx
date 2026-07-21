import { useCallback, useEffect, useState } from 'react';
import { Coffee, Database, FolderOpen, Timer, Watch, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';
import { DatabaseManagementDialog } from '@/features/app-settings/DatabaseManagementDialog';
import { formatAmbientTrackName } from '@/features/timer/use-ambient-audio';


function mergeSave(db: AuraDatabase, patch: AuraRow) {
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  const id = String(cur.id ?? 'app_settings_1');
  db.saveAppSettings({ ...cur, id, ...patch });
  window.dispatchEvent(new Event('settings-saved'));
}

function asBool01(v: unknown): boolean {
  return v === true || v === 1 || v === '1';
}

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

const SECTION_CN = 'overflow-hidden rounded-xl border border-soft/70 bg-card/60 divide-y divide-soft/55';

export function AppSettingsTechnicalCard() {
  const { db, ready } = useAuraDb();
  const [devtoolsTab, setDevtoolsTab] = useState(false);
  const [databaseDialogOpen, setDatabaseDialogOpen] = useState(false);

  const reload = useCallback(() => {
    if (!db) return;
    let cur: AuraRow = {};
    try {
      cur = (db.getAppSettings() ?? {}) as AuraRow;
    } catch (error) {
      console.warn('[Settings] Failed to load app settings row:', error);
    }
    setDevtoolsTab(asBool01(cur.devtools_tab_enabled));
  }, [db]);

  useEffect(() => {
    if (!ready || !db) return;
    reload();
  }, [ready, db, reload]);

if (!ready || !db) {
    return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  }

  return (
    <SettingsSectionCard title="Данные" leadingIcon={Database} contentClassName="gap-3">
      <div className={SECTION_CN}>
          <div className="flex min-h-14 items-center gap-2.5 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-control/60 text-subtle">
              <Database className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">Управление базой</p>
              <p className="mt-0.5 truncate text-xs text-dim">Импорт, экспорт и резервные копии</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 bg-background/70"
              onClick={() => setDatabaseDialogOpen(true)}
            >
              <FolderOpen className="size-3.5" />
              Открыть
            </Button>
          </div>
          <div className="flex min-h-14 items-center gap-2.5 px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-control/60 text-subtle">
              <Wrench className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">Вкладка разработчика</p>
              <p className="mt-0.5 truncate text-xs text-dim">Дополнительная диагностика приложения</p>
            </div>
            <Switch
              className="shrink-0"
              checked={devtoolsTab}
              onCheckedChange={(on) => {
                setDevtoolsTab(on);
                mergeSave(db, { devtools_tab_enabled: on ? 1 : 0 });
                window.dispatchEvent(new CustomEvent('devtoolsTabEnabledChanged', { detail: { enabled: on } }));
              }}
              aria-label="Вкладка разработчика"
            />
          </div>
      </div>

      <DatabaseManagementDialog db={db} open={databaseDialogOpen} onOpenChange={setDatabaseDialogOpen} />
    </SettingsSectionCard>
  );
}

export function TimerBgSettingsCard() {
  const { db, ready } = useAuraDb();
  const [ambientRows, setAmbientRows] = useState<AuraRow[]>([]);
  const [ambientDefaultTimer, setAmbientDefaultTimer] = useState('');
  const [ambientDefaultStopwatch, setAmbientDefaultStopwatch] = useState('');
  const [ambientDefaultBreak, setAmbientDefaultBreak] = useState('');

  const reload = useCallback(() => {
    if (!db) return;
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    setAmbientRows(safeGetAmbientRows(db));
    setAmbientDefaultTimer(cur.ambient_default_timer != null ? String(cur.ambient_default_timer) : '');
    setAmbientDefaultStopwatch(cur.ambient_default_stopwatch != null ? String(cur.ambient_default_stopwatch) : '');
    setAmbientDefaultBreak(cur.ambient_default_break != null ? String(cur.ambient_default_break) : '');
  }, [db]);

  useEffect(() => {
    if (!ready || !db) return;
    reload();
  }, [ready, db, reload]);

  if (!ready || !db) return null;

  const ambientSelectProps = (value: string, onChange: (v: string) => void, id: string) => (
    <Select
      value={value || '__none__'}
      onValueChange={(v) => {
        const next = v === '__none__' ? '' : v;
        onChange(next);
        mergeSave(db, { [id]: next || null });
      }}
    >
      <SelectTrigger id={id} contentAlign="start" className="h-8 w-full text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__" className="text-xs">Не задано</SelectItem>
        {ambientRows.map((r) => (
          <SelectItem key={String(r.id)} value={String(r.id)} className="text-xs">
            {formatAmbientTrackName(String(r.name ?? r.title ?? r.file_name ?? r.id))}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const selectedTrackName = (id: string) => {
    const row = ambientRows.find((r) => String(r.id) === id);
    return row ? formatAmbientTrackName(String(row.name ?? row.title ?? row.file_name ?? row.id)) : 'Не задано';
  };

  const modes = [
    {
      id: 'ambient_default_timer',
      label: 'Таймер',
      Icon: Timer,
      value: ambientDefaultTimer,
      setValue: setAmbientDefaultTimer,
    },
    {
      id: 'ambient_default_stopwatch',
      label: 'Секундомер',
      Icon: Watch,
      value: ambientDefaultStopwatch,
      setValue: setAmbientDefaultStopwatch,
    },
    {
      id: 'ambient_default_break',
      label: 'Перерыв',
      Icon: Coffee,
      value: ambientDefaultBreak,
      setValue: setAmbientDefaultBreak,
    },
  ];

  return (
    <SettingsSectionCard title="Фон таймера" contentClassName="gap-2">
      <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
        {modes.map(({ id, label, Icon, value, setValue }) => (
          <div key={id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-soft/70 bg-control/25 p-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-panel text-subtle">
                <Icon className="size-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="truncate text-xs text-dim">{selectedTrackName(value)}</p>
              </div>
            </div>
            {ambientSelectProps(value, setValue, id)}
          </div>
        ))}
      </div>
    </SettingsSectionCard>
  );
}
