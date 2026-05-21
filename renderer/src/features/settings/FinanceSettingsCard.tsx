import { useCallback, useEffect, useState } from 'react';
import { Coins, PiggyBank, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import type { AuraDatabase, AuraRow } from '@/types/aura';
import { SettingsSectionCard } from '@/widgets/settings/SettingsSectionCard';

const CURRENCY_OPTIONS = [
  { value: 'RUB', symbol: '₽', label: 'Российский рубль', code: 'RUB' },
  { value: 'USD', symbol: '$', label: 'Доллар США', code: 'USD' },
  { value: 'EUR', symbol: '€', label: 'Евро', code: 'EUR' },
  { value: 'GBP', symbol: '£', label: 'Фунт стерлингов', code: 'GBP' },
  { value: 'JPY', symbol: '¥', label: 'Японская иена', code: 'JPY' },
  { value: 'CNY', symbol: '¥', label: 'Китайский юань', code: 'CNY' },
  { value: 'KZT', symbol: '₸', label: 'Казахстанский тенге', code: 'KZT' },
  { value: 'BYN', symbol: 'Br', label: 'Белорусский рубль', code: 'BYN' },
  { value: 'PLN', symbol: 'zł', label: 'Польский злотый', code: 'PLN' },
  { value: 'TRY', symbol: '₺', label: 'Турецкая лира', code: 'TRY' },
  { value: 'AED', symbol: 'د.إ', label: 'Дирхам ОАЭ', code: 'AED' },
  { value: 'CZK', symbol: 'Kč', label: 'Чешская крона', code: 'CZK' },
  { value: 'HUF', symbol: 'Ft', label: 'Венгерский форинт', code: 'HUF' },
  { value: 'NOK', symbol: 'kr', label: 'Норвежская крона', code: 'NOK' },
  { value: 'SEK', symbol: 'kr', label: 'Шведская крона', code: 'SEK' },
  { value: 'CHF', symbol: 'Fr', label: 'Швейцарский франк', code: 'CHF' },
] as const;

function mergeSave(db: AuraDatabase, patch: AuraRow) {
  const cur = (db.getAppSettings() ?? {}) as AuraRow;
  const id = String(cur.id ?? 'app_settings_1');
  db.saveAppSettings({ ...cur, id, ...patch });
  window.dispatchEvent(new Event('settings-saved'));
}

/** Карточка глобальных настроек финансов: валюта и отображение. */
export function FinanceSettingsCard() {
  const { db, ready } = useAuraDb();
  const [currency, setCurrency] = useState('RUB');

  const reload = useCallback(() => {
    if (!db) return;
    const cur = (db.getAppSettings() ?? {}) as AuraRow;
    setCurrency(typeof cur.currency === 'string' && cur.currency ? cur.currency : 'RUB');
  }, [db]);

  useEffect(() => {
    if (!ready || !db) return;
    reload();
  }, [ready, db, reload]);

  if (!ready || !db) return null;

  const selected = CURRENCY_OPTIONS.find((o) => o.value === currency) ?? CURRENCY_OPTIONS[0];

  return (
    <SettingsSectionCard title="Настройки финансов" leadingIcon={PiggyBank}>
      {/* Валюта */}
      <div className="w-full overflow-hidden rounded-xl border border-[var(--aura-border-soft)]">
        {/* Превью выбранной валюты */}
        <div className="flex items-center gap-3 border-b border-[var(--aura-border-soft)] px-4 py-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]">
            <span className="text-lg font-bold leading-none text-[var(--primary)]">{selected.symbol}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{selected.label}</p>
            <p className="text-xs text-[var(--aura-text-muted)]">{selected.code}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[var(--aura-text-subtle)]">
            <Coins className="size-3.5" />
          </div>
        </div>

        {/* Строки настроек */}
        <div className="divide-y divide-[var(--aura-border-soft)]/60">
          <div className="flex min-h-12 items-center gap-3 px-4">
            <TrendingUp className="size-3.5 shrink-0 text-[var(--aura-text-subtle)]" />
            <span className="min-w-0 flex-1 text-sm font-medium">Валюта отображения</span>
            <Select
              value={currency}
              onValueChange={(v) => {
                setCurrency(v);
                mergeSave(db, { currency: v });
              }}
            >
              <SelectTrigger
                id="settings-currency"
                contentAlign="start"
                className="h-8 w-auto min-w-[9rem] border-[var(--aura-border-soft)] bg-[var(--aura-surface-control)] text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {CURRENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-center font-mono font-semibold text-[var(--primary)]">{o.symbol}</span>
                      <span>{o.label}</span>
                      <span className="text-[var(--aura-text-muted)]">{o.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </SettingsSectionCard>
  );
}
