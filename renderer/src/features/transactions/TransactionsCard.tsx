import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Wallet } from 'lucide-react';
import { ListItem } from '@/components/ui/list-item';
import { AddListButton } from '@/components/ui/add-list-button';
import { Progress } from '@/components/ui/progress';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { AddTransactionDialog } from '@/features/transactions/AddTransactionDialog';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { formatAmount } from '@/shared/lib/money';
import { resolveTransactionRow } from '@/shared/lib/finance-display';
import type { AuraRow } from '@/types/aura';
import { cn } from '@/lib/utils';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { AURA_DATA_CHANGED } from '@/features/stats/stats-data-events';

type TransactionsCardProps = {
  cardClassName?: string;
  contentClassName?: string;
};

type FinanceAccountSummary = {
  id: string;
  title: string;
  icon: string | null;
  type: string;
  color: string;
  balance: number;
  target: number;
};

function accountProgress(balance: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((balance / target) * 100)));
}

function loadTopAccounts(db: NonNullable<ReturnType<typeof useAuraDb>['db']>): FinanceAccountSummary[] {
  return db
    .getAll('cfg_accounts')
    .filter((a) => a.id != null && Number(a.home_visible) !== 0)
    .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0))
    .slice(0, 3)
    .map((a) => ({
      id: String(a.id),
      title: String(a.title ?? a.name ?? a.id),
      icon: typeof a.icon === 'string' && a.icon.trim() ? a.icon.trim() : null,
      type: String(a.type ?? 'regular'),
      color: typeof a.color === 'string' && a.color.trim() ? String(a.color) : 'var(--primary)',
      balance: Number(a.balance) || 0,
      target: Number(a.target) || 0,
    }));
}

export function TransactionsCard({ cardClassName, contentClassName }: TransactionsCardProps = {}) {
  const { dateString } = useSelectedDate();
  const { db, ready } = useAuraDb();
  const [rows, setRows] = useState<AuraRow[]>([]);
  const [currency, setCurrency] = useState<string | undefined>('RUB');
  const [topAccounts, setTopAccounts] = useState<FinanceAccountSummary[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AuraRow | null>(null);

  const reload = useCallback(() => {
    if (!db) {
      setRows([]);
      return;
    }
    const settings = db.getAppSettings();
    setCurrency(typeof settings?.currency === 'string' ? settings.currency : 'RUB');
    setRows(db.getTransactions(dateString));
    setTopAccounts(loadTopAccounts(db));
  }, [db, dateString]);

  useEffect(() => {
    if (!ready) return;
    reload();
  }, [ready, reload]);

  useEffect(() => {
    const onData = (event: Event) => {
      const type = (event as CustomEvent<{ type?: string }>).detail?.type;
      if (type === 'transaction') reload();
    };
    window.addEventListener(AURA_DATA_CHANGED, onData);
    return () => window.removeEventListener(AURA_DATA_CHANGED, onData);
  }, [reload]);

  const remove = (id: string) => {
    if (!db) return;
    try {
      runAuraMutation('transaction', () => db.deleteTransaction(id));
      reload();
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col', cardClassName)}>
        <div className={cn('flex min-h-0 flex-1 flex-col gap-1', contentClassName)}>
          {!ready ? (
            <p className="text-muted-foreground text-sm">Загрузка…</p>
          ) : !db ? (
            <p className="text-muted-foreground text-sm">База данных недоступна.</p>
          ) : (
            <>
              {topAccounts.length > 0 ? (
                <div className="mb-2 grid auto-cols-fr gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(topAccounts.length, 3)}, 1fr)` }}>
                  {topAccounts.map((acc) => {
                    const isSavings = acc.type === 'savings';
                    const hasTarget = acc.target > 0;
                    const pct = accountProgress(acc.balance, acc.target);
                    return (
                      <div key={acc.id} className="rounded-xl border border-border/50 bg-background/80 px-3 py-2.5">
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50"
                            aria-hidden
                          >
                            {acc.icon ? (
                              <AuraThemedIcon name={acc.icon} size={14} />
                            ) : (
                              <Wallet className="text-muted-foreground size-3.5" />
                            )}
                          </span>
                          <p className="truncate text-xs font-semibold tracking-wide text-muted-foreground">{acc.title}</p>
                        </div>
                        <p className="truncate text-base font-semibold tracking-tight text-foreground">
                          {formatAmount(acc.balance, currency)}
                          {hasTarget ? (
                            <span className="ml-1 text-xs font-medium text-muted-foreground">/ {formatAmount(acc.target, currency)}</span>
                          ) : null}
                        </p>
                        {isSavings ? (
                          <Progress
                            value={hasTarget ? pct : 0}
                            className={cn(
                              'mt-2 h-1.5 bg-muted/75 [&_[data-slot=progress-indicator]]:bg-[var(--progress-color)] [&_[data-slot=progress-indicator]]:transition-transform [&_[data-slot=progress-indicator]]:duration-aura-glide',
                              !hasTarget && 'opacity-40'
                            )}
                            style={{ ['--progress-color' as string]: acc.color }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {rows.length === 0 ? null : (
                <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-y-contain pr-0.5">
                  {rows.map((t) => {
                    const id = String(t.id);
                    const r = resolveTransactionRow(db, t);
                    const amount = t.amount;
                    const desc = t.description ? String(t.description) : '';
                    const tint = r.accentColor ?? 'var(--muted-foreground)';
                    return (
                      <li key={id}>
                        <ListItem
                          mode="edit-delete"
                          icon={r.iconName}
                          iconTint={tint}
                          title={
                            r.isCompulsiveExpense ? (
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <span className="truncate">{r.title}</span>
                                <span
                                  className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[10px] leading-none text-amber-700 dark:text-amber-200"
                                  title="Импульсивная покупка"
                                >
                                  <AlertTriangle className="size-3" aria-hidden />
                                </span>
                              </span>
                            ) : (
                              r.title
                            )
                          }
                          amount={`${r.typeKey === 'expense' ? '−' : r.typeKey === 'income' ? '+' : ''}${formatAmount(amount, currency)}`}
                          description={desc ? <span className="line-clamp-2 text-xs">{desc}</span> : undefined}
                          onEdit={() => {
                            setEditingTransaction(t);
                            setAddOpen(true);
                          }}
                          onDelete={() => remove(id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
          <AddListButton
            onClick={() => {
              setEditingTransaction(null);
              setAddOpen(true);
            }}
            disabled={!ready || !db}
            className="mt-auto"
          />
        </div>
      </div>
      {db ? (
        <AddTransactionDialog
          dateString={dateString}
          currencyCode={currency}
          open={addOpen}
          initialTransaction={editingTransaction}
          onOpenChange={(next) => {
            setAddOpen(next);
            if (!next) setEditingTransaction(null);
          }}
          onSaved={() => {
            reload();
            setEditingTransaction(null);
          }}
        />
      ) : null}
    </>
  );
}
