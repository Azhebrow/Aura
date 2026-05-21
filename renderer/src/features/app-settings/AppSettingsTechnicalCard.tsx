import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Database, FolderOpen, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';
import { DatabaseManagementDialog } from '@/features/app-settings/DatabaseManagementDialog';


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

function CompactField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="text-caption font-semibold text-[var(--aura-text-subtle)]">{label}</Label>
      {children}
    </div>
  );
}

const SECTION_CN = 'overflow-hidden rounded-lg border border-[var(--aura-border-soft)]/50 divide-y divide-[var(--aura-border-soft)]/40';

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
      {/* База и режим */}
      <div className="flex flex-col gap-2">
        <p className="aura-label">База и режим</p>
        <div className={SECTION_CN}>
          <div className="flex min-h-10 items-center gap-2.5 px-3 py-2">
            <Database className="size-3.5 shrink-0 text-[var(--aura-text-subtle)]" />
            <span className="flex-1 text-xs font-medium text-foreground">Управление базой</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0"
              onClick={() => setDatabaseDialogOpen(true)}
            >
              <FolderOpen className="size-3.5" />
              Открыть
            </Button>
          </div>
          <div className="flex h-10 items-center gap-2.5 px-3">
            <Wrench className="size-3.5 shrink-0 text-[var(--aura-text-subtle)]" />
            <span className="flex-1 text-xs font-medium text-foreground">Вкладка разработчика</span>
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
            {String(r.name ?? r.title ?? r.id)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <SettingsSectionCard title="Фон таймера">
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
        <CompactField label="Таймер">
          {ambientSelectProps(ambientDefaultTimer, setAmbientDefaultTimer, 'ambient_default_timer')}
        </CompactField>
        <CompactField label="Секундомер">
          {ambientSelectProps(ambientDefaultStopwatch, setAmbientDefaultStopwatch, 'ambient_default_stopwatch')}
        </CompactField>
        <CompactField label="Перерыв">
          {ambientSelectProps(ambientDefaultBreak, setAmbientDefaultBreak, 'ambient_default_break')}
        </CompactField>
      </div>
    </SettingsSectionCard>
  );
}
