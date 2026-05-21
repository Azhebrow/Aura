import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  BookText,
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  Download,
  FileText,
  Flag,
  FolderOpen,
  Heart,
  ListChecks,
  Moon,
  Music,
  Sun,
  Target,
  Trash2,
  Upload,
  Search,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UniversalModalContent } from '@/components/ui/universal-modal';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { AuraDatabase } from '@/types/aura';
import { cn } from '@/lib/utils';

type RuntimeDb = AuraDatabase & {
  dbPath?: string;
  db?: {
    pragma?: (query: string) => unknown;
    prepare?: (query: string) => {
      all: () => Array<{ name: string }>;
      get: () => { count?: number } | undefined;
    };
  };
  getInfo?: () => { path?: string; tables?: DbTableInfo[]; error?: string };
  clearDatabase?: () => void;
  reloadPresets?: () => void;
  close?: () => void;
};

type DbTableInfo = {
  name: string;
  rowCount: number;
};

type DbStats = {
  path: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  totalRecords: number;
  cfgTables: DbTableInfo[];
  actTables: DbTableInfo[];
  error: string | null;
};

type TableMeta = {
  label: string;
  icon: LucideIcon;
};

const TABLE_META: Record<string, TableMeta> = {
  cfg_accounts: { label: 'Счета', icon: Wallet },
  cfg_ambient_music: { label: 'Фоновая музыка', icon: Music },
  cfg_diary_categories: { label: 'Категории дневника', icon: BookOpen },
  cfg_diary_moods: { label: 'Настроения', icon: FileText },
  cfg_diary_entry_presets: { label: 'Цитаты записи', icon: BookText },
  cfg_expense_categories: { label: 'Категории расходов', icon: Wallet },
  cfg_goal_stages: { label: 'Этапы целей', icon: Flag },
  cfg_goal_tasks: { label: 'Задачи целей', icon: CheckCircle2 },
  cfg_goals: { label: 'Цели', icon: Target },
  cfg_income_categories: { label: 'Категории доходов', icon: Wallet },
  cfg_leisure_tasks: { label: 'Задачи досуга', icon: ListChecks },
  cfg_rituals_evening: { label: 'Вечерние ритуалы', icon: Moon },
  cfg_rituals_morning: { label: 'Утренние ритуалы', icon: Sun },
  cfg_tasks: { label: 'Задачи', icon: ListChecks },
  cfg_vows: { label: 'Обеты', icon: Heart },
  act_daily_plans: { label: 'Ежедневные планы', icon: Calendar },
  act_daily_points: { label: 'Очки за день', icon: CheckCircle2 },
  act_diary_entries: { label: 'Записи дневника', icon: BookOpen },
  act_goal_tasks: { label: 'Выполнение задач целей', icon: CheckCircle2 },
  act_rituals_evening: { label: 'Выполнение вечерних ритуалов', icon: Moon },
  act_rituals_morning: { label: 'Выполнение утренних ритуалов', icon: Sun },
  act_task_completions: { label: 'Выполнение задач', icon: CheckCircle2 },
  act_tasks: { label: 'Задачи дня', icon: ListChecks },
  act_timer_sessions: { label: 'Сессии таймера', icon: Clock3 },
  act_transactions: { label: 'Транзакции', icon: Wallet },
};

function getNodeRequire(): ((id: string) => unknown) | null {
  const w = window as unknown as { require?: (id: string) => unknown };
  if (typeof w.require === 'function') return w.require;
  return null;
}

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Б';
  const units = ['Б', 'КБ', 'МБ', 'ГБ'];
  const base = 1024;
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(base)));
  const value = bytes / Math.pow(base, index);
  return `${Math.round(value * 100) / 100} ${units[index]}`;
}

function normalizeTables(tables: DbTableInfo[] | undefined): DbTableInfo[] {
  if (!Array.isArray(tables)) return [];
  return tables
    .filter((table) => table && typeof table.name === 'string')
    .map((table) => ({
      name: table.name,
      rowCount: Number.isFinite(table.rowCount) ? Number(table.rowCount) : 0,
    }))
    .sort((a, b) => b.rowCount - a.rowCount || a.name.localeCompare(b.name, 'ru'));
}

function sanitizeIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function loadTablesFromDirectDb(runtimeDb: RuntimeDb): DbTableInfo[] {
  const prepare = runtimeDb.db?.prepare;
  if (!prepare) return [];
  try {
    const tableRows = prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();
    return tableRows
      .map((row) => String(row.name))
      .filter(Boolean)
      .map((tableName) => {
        let rowCount = 0;
        try {
          const countRow = prepare(`SELECT COUNT(*) as count FROM ${sanitizeIdentifier(tableName)}`).get();
          rowCount = Number(countRow?.count ?? 0);
        } catch {
          rowCount = 0;
        }
        return { name: tableName, rowCount };
      });
  } catch {
    return [];
  }
}

function verifySQLiteIntegrity(filePath: string): { ok: boolean; details: string } {
  const req = getNodeRequire();
  if (!req) return { ok: false, details: 'Node.js require недоступен' };
  try {
    const BetterSqlite3 = req('better-sqlite3') as new (path: string, options?: { readonly?: boolean }) => {
      pragma: (query: string) => unknown;
      close: () => void;
    };
    const db = new BetterSqlite3(filePath, { readonly: true });
    const raw = db.pragma('integrity_check');
    db.close();
    const line =
      Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0] && 'integrity_check' in raw[0]
        ? String((raw[0] as { integrity_check?: string }).integrity_check ?? '')
        : typeof raw === 'string'
          ? raw
          : '';
    return line.toLowerCase() === 'ok'
      ? { ok: true, details: 'ok' }
      : { ok: false, details: line || 'integrity_check не вернул ok' };
  } catch (error) {
    return { ok: false, details: error instanceof Error ? error.message : 'Ошибка проверки целостности' };
  }
}

function markImportedDatabaseOnboarded(filePath: string) {
  const req = getNodeRequire();
  if (!req) return;
  try {
    const BetterSqlite3 = req('better-sqlite3') as new (path: string) => {
      prepare: (query: string) => { run: (...args: unknown[]) => unknown };
      close: () => void;
    };
    const importedDb = new BetterSqlite3(filePath);
    importedDb.prepare(
      "UPDATE app_settings SET onboarding_complete = 1, updated_at = datetime('now') WHERE id = 'default'"
    ).run();
    importedDb.close();
  } catch {
    /* best effort: импорт не должен падать из-за флага onboarding */
  }
}

function toRuntimeDb(db: AuraDatabase): RuntimeDb {
  return db as RuntimeDb;
}

export function DatabaseManagementDialog({
  db,
  open,
  onOpenChange,
}: {
  db: AuraDatabase;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const runtimeDb = toRuntimeDb(db);
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const info = runtimeDb.getInfo?.();
      const path = info?.path ?? runtimeDb.dbPath ?? '';
      const fromInfo = normalizeTables(info?.tables);
      const allTables = fromInfo.length > 0 ? fromInfo : normalizeTables(loadTablesFromDirectDb(runtimeDb));
      const cfgTables = allTables.filter((table) => table.name.startsWith('cfg_'));
      const actTables = allTables.filter((table) => table.name.startsWith('act_'));
      const totalRecords = allTables.reduce((sum, table) => sum + table.rowCount, 0);

      let fileSizeBytes = 0;
      if (path) {
        const req = getNodeRequire();
        const fs = req ? (req('fs') as { existsSync: (filePath: string) => boolean; statSync: (filePath: string) => { size: number } }) : null;
        if (fs?.existsSync(path)) {
          fileSizeBytes = fs.statSync(path).size;
        }
      }

      setStats({
        path,
        fileSizeBytes,
        fileSizeFormatted: formatFileSize(fileSizeBytes),
        totalRecords,
        cfgTables,
        actTables,
        error: allTables.length === 0 ? info?.error ?? 'Таблицы не прочитались: проверь доступ к БД.' : info?.error ?? null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось получить статистику';
      setStats({
        path: runtimeDb.dbPath ?? '',
        fileSizeBytes: 0,
        fileSizeFormatted: '0 Б',
        totalRecords: 0,
        cfgTables: [],
        actTables: [],
        error: message,
      });
    } finally {
      setLoading(false);
    }
  }, [runtimeDb]);

  useEffect(() => {
    if (!open) return;
    void loadStats();
  }, [open, loadStats]);

  const runAction = useCallback(
    async (name: string, action: () => Promise<void>) => {
      if (busyAction) return;
      setBusyAction(name);
      try {
        await action();
      } finally {
        setBusyAction(null);
      }
    },
    [busyAction]
  );

  const openDatabaseFolder = useCallback(async () => {
    if (!stats?.path) return;
    const req = getNodeRequire();
    const pathModule = req ? (req('path') as { dirname: (path: string) => string }) : null;
    const electron = req ? (req('electron') as { shell?: { openPath: (path: string) => Promise<string> } }) : null;
    if (!pathModule || !electron?.shell) return;
    await electron.shell.openPath(pathModule.dirname(stats.path));
  }, [stats?.path]);

  const copyPath = useCallback(async () => {
    if (!stats?.path) return;
    await navigator.clipboard.writeText(stats.path);
  }, [stats?.path]);

  const clearDatabase = useCallback(async () => {
    if (!runtimeDb.clearDatabase) {
      window.alert('Метод clearDatabase не найден в базе данных');
      return;
    }
    if (!window.confirm('Шаг 1/3: очистить всю базу данных? Это необратимо.')) {
      return;
    }
    if (!window.confirm('Шаг 2/3: точно очистить все данные?')) {
      return;
    }
    if (!window.confirm('Шаг 3/3: финальное подтверждение очистки. Продолжить?')) {
      return;
    }
    runtimeDb.clearDatabase();
    window.alert('База данных очищена. Приложение будет перезапущено.');
    window.location.reload();
  }, [runtimeDb]);

  const exportDatabase = useCallback(async () => {
    const req = getNodeRequire();
    const electron = req
      ? (req('electron') as {
          ipcRenderer?: { invoke: (channel: string, options: Record<string, unknown>) => Promise<{ canceled?: boolean; filePath?: string }> };
        })
      : null;
    const fs = req
      ? (req('fs') as {
          existsSync: (filePath: string) => boolean;
          copyFileSync: (from: string, to: string) => void;
          statSync: (filePath: string) => { size: number };
        })
      : null;
    if (!electron?.ipcRenderer || !fs) {
      window.alert('Экспорт доступен только в Electron среде.');
      return;
    }

    const sourcePath = runtimeDb.dbPath ?? stats?.path;
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      window.alert('Файл базы данных не найден');
      return;
    }

    runtimeDb.db?.pragma?.('wal_checkpoint(FULL)');
    const defaultFileName = `aura-backup-${new Date().toISOString().slice(0, 10)}.db`;
    const result = await electron.ipcRenderer.invoke('dialog:showSaveDialog', {
      title: 'Экспорт базы данных',
      defaultPath: defaultFileName,
      filters: [
        { name: 'База данных SQLite', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'Все файлы', extensions: ['*'] },
      ],
    });
    if (result.canceled || !result.filePath) return;

    fs.copyFileSync(sourcePath, result.filePath);
    const walPath = `${sourcePath}-wal`;
    const shmPath = `${sourcePath}-shm`;
    if (fs.existsSync(walPath) && fs.statSync(walPath).size > 0) {
      fs.copyFileSync(walPath, `${result.filePath}-wal`);
    }
    if (fs.existsSync(shmPath) && fs.statSync(shmPath).size > 0) {
      fs.copyFileSync(shmPath, `${result.filePath}-shm`);
    }
    const integrity = verifySQLiteIntegrity(result.filePath);
    if (!integrity.ok) {
      window.alert(`Экспорт завершен, но проверка целостности не пройдена:\n${integrity.details}`);
      return;
    }
    window.alert(`Экспорт завершен и проверен:\n${result.filePath}`);
  }, [runtimeDb, stats?.path]);

  const importDatabase = useCallback(async () => {
    const req = getNodeRequire();
    const electron = req
      ? (req('electron') as {
          ipcRenderer?: {
            invoke: (
              channel: string,
              options: Record<string, unknown>
            ) => Promise<{ canceled?: boolean; filePaths?: string[] }>;
          };
        })
      : null;
    const fs = req
      ? (req('fs') as {
          existsSync: (filePath: string) => boolean;
          copyFileSync: (from: string, to: string) => void;
          unlinkSync: (path: string) => void;
          renameSync: (from: string, to: string) => void;
        })
      : null;
    if (!electron?.ipcRenderer || !fs) {
      window.alert('Импорт доступен только в Electron среде.');
      return;
    }

    const result = await electron.ipcRenderer.invoke('dialog:showOpenDialog', {
      title: 'Выберите файл базы данных',
      filters: [
        { name: 'База данных SQLite', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'Все файлы', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    const filePath = result.filePaths?.[0];
    if (result.canceled || !filePath) return;
    if (!window.confirm('Импорт заменит текущую базу данных. Продолжить?')) return;

    const targetPath = runtimeDb.dbPath ?? stats?.path;
    if (!targetPath) {
      window.alert('Не удалось определить путь к текущей базе');
      return;
    }

    const importIntegrity = verifySQLiteIntegrity(filePath);
    if (!importIntegrity.ok) {
      window.alert(`Импорт отменен: файл поврежден или не SQLite.\n${importIntegrity.details}`);
      return;
    }

    runtimeDb.db?.pragma?.('wal_checkpoint(FULL)');
    runtimeDb.close?.();
    const backupPath = `${targetPath}.backup.${Date.now()}`;
    if (fs.existsSync(targetPath)) fs.renameSync(targetPath, backupPath);
    if (fs.existsSync(`${targetPath}-wal`)) fs.unlinkSync(`${targetPath}-wal`);
    if (fs.existsSync(`${targetPath}-shm`)) fs.unlinkSync(`${targetPath}-shm`);
    try {
      fs.copyFileSync(filePath, targetPath);
      const targetIntegrity = verifySQLiteIntegrity(targetPath);
      if (!targetIntegrity.ok) {
        throw new Error(`Проверка новой БД не пройдена: ${targetIntegrity.details}`);
      }
      markImportedDatabaseOnboarded(targetPath);
    } catch (error) {
      if (fs.existsSync(backupPath)) {
        fs.renameSync(backupPath, targetPath);
      }
      window.alert(`Импорт не удался, восстановлена резервная копия.\n${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      return;
    }

    window.alert('Импорт завершен и проверен. Приложение будет перезапущено.');
    window.location.reload();
  }, [runtimeDb, stats?.path]);

  const normalizedSearch = search.trim().toLowerCase();
  const cfgTables = useMemo(
    () =>
      (stats?.cfgTables ?? []).filter((table) =>
        normalizedSearch ? table.name.toLowerCase().includes(normalizedSearch) || (TABLE_META[table.name]?.label ?? '').toLowerCase().includes(normalizedSearch) : true
      ),
    [stats?.cfgTables, normalizedSearch]
  );
  const actTables = useMemo(
    () =>
      (stats?.actTables ?? []).filter((table) =>
        normalizedSearch ? table.name.toLowerCase().includes(normalizedSearch) || (TABLE_META[table.name]?.label ?? '').toLowerCase().includes(normalizedSearch) : true
      ),
    [stats?.actTables, normalizedSearch]
  );
  const tableGroups = useMemo(
    () => [
      { key: 'cfg', title: `Конфигурация (${cfgTables.length})`, items: cfgTables },
      { key: 'act', title: `Активность (${actTables.length})`, items: actTables },
    ],
    [actTables, cfgTables]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
      }}
    >
      <UniversalModalContent
        size="picker"
        scroll="content"
        className="flex h-[min(92svh,52rem)] flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="shrink-0 border-b border-[var(--aura-border-soft)] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3 pr-10">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] text-primary">
              <Database className="size-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-left text-sm font-semibold leading-tight">Управление базой данных</DialogTitle>
              <DialogDescription className="mt-1 text-left text-xs leading-snug text-[var(--aura-text-muted)]">
                Экспорт, импорт и просмотр структуры текущего файла.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1.55fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]">
            <section className="min-w-0 rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-caption font-semibold uppercase tracking-wide text-[var(--aura-text-muted)]">Файл базы</p>
                <Button variant="ghost" size="icon-xs" className="shrink-0" onClick={() => void copyPath()} disabled={!stats?.path} title="Скопировать путь">
                  <Copy className="size-3" />
                </Button>
              </div>
              <button
                type="button"
                onClick={openDatabaseFolder}
                className="mt-1 block max-w-full truncate text-left font-mono text-xs text-foreground hover:underline disabled:pointer-events-none disabled:text-[var(--aura-text-disabled)]"
                title={stats?.path || 'Путь не найден'}
                disabled={!stats?.path}
              >
                {stats?.path || 'Путь не найден'}
              </button>
            </section>
            <section className="rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-3 py-2.5">
              <p className="text-caption font-semibold uppercase tracking-wide text-[var(--aura-text-muted)]">Размер</p>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">{stats?.fileSizeFormatted ?? '—'}</p>
            </section>
            <section className="rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)] px-3 py-2.5">
              <p className="text-caption font-semibold uppercase tracking-wide text-[var(--aura-text-muted)]">Записи</p>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums text-foreground">{(stats?.totalRecords ?? 0).toLocaleString('ru-RU')}</p>
            </section>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--aura-text-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти таблицу: cfg_tasks, diary, nutrition..."
              className="h-9 rounded-lg border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] pl-9 text-sm shadow-none"
            />
          </div>

          <ScrollArea className="min-h-0 flex-1 rounded-lg border border-[var(--aura-border-soft)] bg-[var(--aura-surface-panel)]">
            <div className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2">
              {tableGroups.map((group) => (
                <section key={group.key} className="overflow-hidden rounded-lg border border-[var(--aura-border-soft)] bg-card">
                  <header className="border-b border-[var(--aura-border-soft)] px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--aura-text-muted)]">{group.title}</p>
                  </header>
                  <div className="divide-y divide-[var(--aura-border-soft)]">
                    {group.items.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-[var(--aura-text-muted)]">
                        {normalizedSearch ? 'Нет совпадений по фильтру' : 'Нет таблиц'}
                      </p>
                    ) : (
                      group.items.map((table) => {
                        const meta = TABLE_META[table.name];
                        const Icon = meta?.icon ?? Database;
                        return (
                          <div key={table.name} className="flex items-center justify-between gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
                                <Icon className="size-3.5 shrink-0 text-[var(--aura-text-muted)]" />
                                <span className="truncate">{meta?.label ?? table.name}</span>
                              </p>
                              <p className="truncate font-mono text-caption text-[var(--aura-text-muted)]">{table.name}</p>
                            </div>
                            <span className="shrink-0 rounded-md border border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] px-1.5 py-0.5 font-mono text-xs tabular-nums text-foreground">
                              {table.rowCount.toLocaleString('ru-RU')}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>

          {stats?.error ? (
            <div className="flex shrink-0 items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{stats.error}</span>
            </div>
          ) : null}
        </div>

        <DialogFooter variant="flush" className="border-t border-[var(--aura-border-soft)] px-4 py-3 sm:px-5">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => void runAction('open-folder', openDatabaseFolder)}
                disabled={!stats?.path || !!busyAction}
                title="Открыть папку с файлом базы данных"
              >
                <FolderOpen className="size-3.5" />
                Открыть папку
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={() => void runAction('export', exportDatabase)} disabled={!!busyAction || loading}>
                <Download className="size-3.5" />
                Экспорт
              </Button>
              <Button variant="outline" onClick={() => void runAction('import', importDatabase)} disabled={!!busyAction || loading}>
                <Upload className="size-3.5" />
                Импорт
              </Button>
              <Button
                variant="destructive"
                className={cn('bg-destructive/15 text-destructive hover:bg-destructive/25', 'dark:bg-destructive/18 dark:hover:bg-destructive/28')}
                onClick={() => void runAction('clear', clearDatabase)}
                disabled={!!busyAction || loading}
              >
                <Trash2 className="size-3.5" />
                Очистить
              </Button>
            </div>
          </div>
        </DialogFooter>
      </UniversalModalContent>
    </Dialog>
  );
}
