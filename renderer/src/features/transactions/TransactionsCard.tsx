import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { ActComposerValueField, ActList, ActSelectOptionLabel, type ActItem } from '@/features/act-system';
import { ActField, ActModal, ActModalFooter, ActModeSwitch, ActTableBox } from '@/features/act/ActModal';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { formatAmount } from '@/shared/lib/money';
import { resolveTransactionRow } from '@/shared/lib/finance-display';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import type { AuraRow } from '@/types/aura';
import { cn } from '@/lib/utils';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { LoadingShell } from '@/shared/ui/data-states';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { ProgressFillRow } from '@/shared/ui/progress-fill-row';

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

type TxType = 'expense' | 'income' | 'transfer';

const TX_TYPE_OPTIONS = [
  { value: 'expense' as const, label: 'Расход', icon: TrendingDown, color: 'var(--destructive)' },
  { value: 'income' as const, label: 'Доход', icon: TrendingUp, color: 'var(--success, var(--primary))' },
  { value: 'transfer' as const, label: 'Перевод', icon: ArrowRightLeft, color: 'var(--primary)' },
];

function transactionModalTitle(type: TxType) {
  if (type === 'income') return 'Доход';
  if (type === 'transfer') return 'Перевод';
  return 'Расход';
}

function transactionModalIcon(type: TxType) {
  if (type === 'income') return TrendingUp;
  if (type === 'transfer') return ArrowRightLeft;
  return TrendingDown;
}

function accountProgress(balance: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((balance / target) * 100)));
}

function loadTopAccounts(db: NonNullable<ReturnType<typeof useAuraDb>['db']>): FinanceAccountSummary[] {
  let rows: AuraRow[] = [];
  try {
    rows = db.getAll('cfg_accounts') as AuraRow[];
  } catch (error) {
    console.warn('[AURA] Failed to read finance accounts for summary, using empty state.', error);
    rows = [];
  }
  return rows
    .filter((a) => a.id != null && Number(a.home_visible) !== 0)
    .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0))
    .slice(0, 2)
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
  const { db } = useAuraDb();
  const { data: txData, status, reload } = useAsyncData<{
    rows: AuraRow[];
    currency: string;
    topAccounts: FinanceAccountSummary[];
  }>(
    (database) => ({
      rows: database.getTransactions(dateString),
      currency: (() => {
        const settings = database.getAppSettings() as AuraRow | null;
        return typeof settings?.currency === 'string' ? settings.currency : 'RUB';
      })(),
      topAccounts: loadTopAccounts(database),
    }),
    [dateString],
    { events: ['transaction'] }
  );
  const [composerEditingId, setComposerEditingId] = useState<string | null>(null);
  const [composerTxType, setComposerTxType] = useState<TxType>('expense');
  const [composerAmount, setComposerAmount] = useState('');
  const [composerAccountId, setComposerAccountId] = useState('');
  const [composerCategoryId, setComposerCategoryId] = useState('');
  const [composerFromId, setComposerFromId] = useState('');
  const [composerToId, setComposerToId] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const rows = txData?.rows ?? [];
  const currency = txData?.currency ?? 'RUB';
  const topAccounts = txData?.topAccounts ?? [];
  const accounts = useMemo(() => {
    if (!db) return [];
    try {
      return db.getAll('cfg_accounts').filter((row) => row.id);
    } catch (error) {
      console.warn('[AURA] Failed to read finance accounts, using empty list.', error);
      return [];
    }
  }, [db, status]);
  const categories = useMemo(() => {
    if (!db || composerTxType === 'transfer') return [];
    const table = composerTxType === 'income' ? 'cfg_income_categories' : 'cfg_expense_categories';
    try {
      return db.getAll(table).filter((row) => row.id);
    } catch (error) {
      console.warn('[AURA] Failed to read finance categories, using empty list.', error);
      return [];
    }
  }, [composerTxType, db, status]);

  useEffect(() => {
    if (!accounts.length) {
      setComposerAccountId('');
      setComposerFromId('');
      setComposerToId('');
      return;
    }
    const ids = accounts.map((account) => String(account.id));
    setComposerAccountId((prev) => (prev && ids.includes(prev) ? prev : ids[0]));
    setComposerFromId((prev) => (prev && ids.includes(prev) ? prev : ids[0]));
    setComposerToId((prev) => {
      if (prev && ids.includes(prev) && prev !== (composerFromId || ids[0])) return prev;
      return ids.find((id) => id !== (composerFromId || ids[0])) ?? ids[0];
    });
  }, [accounts, composerFromId]);

  useEffect(() => {
    if (!categories.length) {
      setComposerCategoryId('');
      return;
    }
    const ids = categories.map((category) => String(category.id));
    setComposerCategoryId((prev) => (prev && ids.includes(prev) ? prev : ids[0]));
  }, [categories]);
  const removeTx = (id: string) => {
    if (!db) return;
    const ok = runAuraMutation('transaction', () => db.deleteTransaction(id));
    if (ok === false) {
      setComposerError('Не удалось удалить операцию.');
      return;
    }
    if (composerEditingId === id) resetComposer();
    reload({ silent: false });
  };
  const resetComposer = () => {
    setComposerEditingId(null);
    setComposerAmount('');
    setComposerError(null);
  };
  const loadTransactionIntoComposer = (tx: AuraRow) => {
    const type = tx.type === 'income' || tx.type === 'transfer' ? tx.type : 'expense';
    setComposerEditingId(String(tx.id));
    setComposerTxType(type);
    setComposerAmount(String(tx.amount ?? ''));
    setComposerAccountId(String(tx.account_id ?? ''));
    setComposerCategoryId(String(tx.category_id ?? ''));
    setComposerFromId(String(tx.from_id ?? ''));
    setComposerToId(String(tx.to_id ?? ''));
  };
  const saveComposerTransaction = () => {
    if (!db) return;
    setComposerError(null);
    const value = parseFloat(composerAmount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setComposerError('Введите сумму больше нуля.');
      return;
    }
    if (composerTxType === 'transfer') {
      if (!composerFromId || !composerToId) {
        setComposerError('Выберите оба счёта для перевода.');
        return;
      }
      if (composerFromId === composerToId) {
        setComposerError('Нельзя переводить на тот же счёт.');
        return;
      }
    } else if (!composerAccountId || !composerCategoryId) {
      setComposerError('Выберите счёт и категорию.');
      return;
    }
    const now = new Date().toISOString();
    const existing = composerEditingId ? rows.find((row) => String(row.id) === composerEditingId) : null;
    const id = composerEditingId ?? `txn_${dateString.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const payload = {
      id,
      date: String(existing?.date ?? dateString),
      type: composerTxType,
      amount: value,
      account_id: composerTxType === 'transfer' ? null : composerAccountId,
      from_id: composerTxType === 'transfer' ? composerFromId : null,
      to_id: composerTxType === 'transfer' ? composerToId : null,
      category_id: composerTxType === 'transfer' ? null : composerCategoryId,
      description: existing?.description ?? null,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    const ok = runAuraMutation('transaction', () => {
      if (composerEditingId) db.updateTransaction(id, payload);
      else db.addTransaction(payload);
    }, dateString);
    if (ok === false) {
      setComposerError('Операция не сохранена. Проверьте сумму и выбранные счета.');
      return;
    }
    resetComposer();
    reload({ silent: false });
  };
  const items: ActItem[] = rows.map((t) => {
    const id = String(t.id);
    const r = db ? resolveTransactionRow(db, t) : null;
    const amount = t.amount;
    const desc = t.description ? String(t.description) : '';
    const tint = r?.accentColor ?? 'var(--aura-text-muted)';
    const amountStr = `${r?.typeKey === 'expense' ? '−' : r?.typeKey === 'income' ? '+' : ''}${formatAmount(amount, currency)}`;
    return {
      id,
      kind: 'transaction',
      icon: r?.iconName ?? null,
      iconTint: tint,
      title: r?.isCompulsiveExpense ? (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="truncate">{r.title}</span>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-xs leading-none text-amber-700 dark:text-amber-200" title="Импульсивная покупка">
            <AlertTriangle className="size-3" aria-hidden />
          </span>
        </span>
      ) : r?.title ?? id,
      value: amountStr,
      description: desc ? <span>{desc}</span> : undefined,
      onEdit: () => loadTransactionIntoComposer(t),
      onDelete: () => removeTx(id),
    };
  });

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col', cardClassName)}>
        <div className={cn('flex min-h-0 flex-1 flex-col', contentClassName)}>
          {status === 'loading' ? (
            <LoadingShell />
          ) : !db ? (
            <p className="text-muted-foreground text-sm">База данных недоступна.</p>
          ) : (
            <>
              {/* Счета */}
              {topAccounts.length > 0 && (
                <div className="grid shrink-0 grid-cols-2 gap-2">
                  {topAccounts.map((acc) => {
                    const hasTarget = acc.target > 0;
                    const pct = accountProgress(acc.balance, acc.target);
                    const fillPct = hasTarget ? pct : 0;
                    return (
                      <ProgressFillRow
                        key={acc.id}
                        title={acc.title}
                        color={acc.color}
                        progress={fillPct}
                        icon={
                          <>
                            {acc.icon
                              ? <AuraThemedIcon name={acc.icon} size={14} tint={acc.color} />
                              : <Wallet className="aura-operator-kpi size-3.5" style={{ color: acc.color }} />}
                          </>
                        }
                        value={
                          <>
                            {formatAmount(acc.balance, currency)}
                          </>
                        }
                        valueTitle={hasTarget ? `${formatAmount(acc.balance, currency)} / ${formatAmount(acc.target, currency)}` : formatAmount(acc.balance, currency)}
                      />
                    );
                  })}
                </div>
              )}

              {composerError ? (
                <p className="shrink-0 rounded-md border border-destructive/20 bg-destructive/8 px-2.5 py-1.5 text-xs text-destructive">
                  {composerError}
                </p>
              ) : null}

              <ActList
                items={items}
                emptyTitle="За этот день пока нет транзакций."
                composer={{
                  options: TX_TYPE_OPTIONS,
                  value: composerTxType,
                  onValueChange: (value) => setComposerTxType(value as TxType),
                  fields: (
                    <div className="grid min-w-0 grid-cols-1 divide-y divide-soft/50 xl:grid-cols-[minmax(0,1fr)_6.5rem] xl:divide-x xl:divide-y-0">
                      {composerTxType === 'transfer' ? (
                        <div className="grid min-w-0 grid-cols-2">
                          <Select value={composerFromId} onValueChange={setComposerFromId} disabled={!db || accounts.length < 2}>
                            <SelectTrigger className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2.5 shadow-none focus:bg-background/45 focus:ring-0">
                              <SelectValue placeholder="Откуда" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Откуда</SelectLabel>
                                {accounts.map((account) => (
                                  <SelectItem key={String(account.id)} value={String(account.id)} textValue={String(account.title ?? account.name ?? account.id)}>
                                    <ActSelectOptionLabel
                                      label={String(account.title ?? account.name ?? account.id)}
                                      icon={typeof account.icon === 'string' ? account.icon : null}
                                      color={typeof account.color === 'string' ? account.color : 'var(--primary)'}
                                    />
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <div className="min-w-0 border-l border-soft/50">
                            <Select value={composerToId} onValueChange={setComposerToId} disabled={!db || accounts.length < 2}>
                              <SelectTrigger className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2.5 shadow-none focus:bg-background/45 focus:ring-0">
                                <SelectValue placeholder="Куда" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Куда</SelectLabel>
                                  {accounts.map((account) => (
                                    <SelectItem key={String(account.id)} value={String(account.id)} textValue={String(account.title ?? account.name ?? account.id)}>
                                      <ActSelectOptionLabel
                                        label={String(account.title ?? account.name ?? account.id)}
                                        icon={typeof account.icon === 'string' ? account.icon : null}
                                        color={typeof account.color === 'string' ? account.color : 'var(--primary)'}
                                      />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid min-w-0 grid-cols-2">
                          <Select value={composerAccountId} onValueChange={setComposerAccountId} disabled={!db || accounts.length === 0}>
                            <SelectTrigger className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2.5 shadow-none focus:bg-background/45 focus:ring-0">
                              <SelectValue placeholder="Счёт" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Счёт</SelectLabel>
                                {accounts.map((account) => (
                                  <SelectItem key={String(account.id)} value={String(account.id)} textValue={String(account.title ?? account.name ?? account.id)}>
                                    <ActSelectOptionLabel
                                      label={String(account.title ?? account.name ?? account.id)}
                                      icon={typeof account.icon === 'string' ? account.icon : null}
                                      color={typeof account.color === 'string' ? account.color : 'var(--primary)'}
                                    />
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          <div className="min-w-0 border-l border-soft/50">
                            <Select value={composerCategoryId} onValueChange={setComposerCategoryId} disabled={!db || categories.length === 0}>
                              <SelectTrigger className="h-8 w-full min-w-0 rounded-none border-0 bg-transparent px-2.5 shadow-none focus:bg-background/45 focus:ring-0">
                                <SelectValue placeholder="Категория" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Категория</SelectLabel>
                                  {categories.map((category) => (
                                    <SelectItem key={String(category.id)} value={String(category.id)} textValue={String(category.title ?? category.name ?? category.id)}>
                                      <ActSelectOptionLabel
                                        label={String(category.title ?? category.name ?? category.id)}
                                        icon={typeof category.icon === 'string' ? category.icon : null}
                                        color={typeof category.color === 'string' ? category.color : 'var(--primary)'}
                                      />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                      <ActComposerValueField
                        id="act-transaction-amount"
                        ariaLabel="Сумма"
                        value={composerAmount}
                        suffix={currency}
                        inputKind="number"
                        placeholder="Сумма"
                        onCommit={setComposerAmount}
                      />
                    </div>
                  ),
                  disabled: status === 'refreshing' || !db,
                  submitDisabled: !(parseFloat(composerAmount.replace(',', '.')) > 0)
                    || (composerTxType === 'transfer'
                      ? !composerFromId || !composerToId || composerFromId === composerToId
                      : !composerAccountId || !composerCategoryId),
                  submitLabel: composerEditingId ? 'Сохранить' : 'Добавить',
                  onSubmit: saveComposerTransaction,
                }}
              />
              <Dialog open={composerEditingId != null} onOpenChange={(open) => { if (!open) resetComposer(); }}>
                <ActModal
                  title={`Редактировать: ${transactionModalTitle(composerTxType)}`}
                  icon={transactionModalIcon(composerTxType)}
                  size="md"
                  onSubmit={saveComposerTransaction}
                  footer={
                    <ActModalFooter
                      cancelLabel="Отмена"
                      submitLabel="Сохранить"
                      submitDisabled={!(parseFloat(composerAmount.replace(',', '.')) > 0)
                        || (composerTxType === 'transfer'
                          ? !composerFromId || !composerToId || composerFromId === composerToId
                          : !composerAccountId || !composerCategoryId)}
                      onCancel={resetComposer}
                      onSubmit={saveComposerTransaction}
                    />
                  }
                >
                  <div className="flex flex-col gap-3">
                    {composerError ? (
                      <p className="rounded-md border border-destructive/20 bg-destructive/8 px-2.5 py-1.5 text-xs text-destructive">
                        {composerError}
                      </p>
                    ) : null}
                    <ActTableBox>
                      <ActField label="Тип">
                        <ActModeSwitch
                          value={composerTxType}
                          options={TX_TYPE_OPTIONS}
                          onValueChange={(value) => setComposerTxType(value)}
                        />
                      </ActField>
                      {composerTxType === 'transfer' ? (
                        <>
                          <ActField label="Откуда">
                            <Select value={composerFromId} onValueChange={setComposerFromId} disabled={!db || accounts.length < 2}>
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Откуда" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Откуда</SelectLabel>
                                  {accounts.map((account) => (
                                    <SelectItem key={String(account.id)} value={String(account.id)} textValue={String(account.title ?? account.name ?? account.id)}>
                                      <ActSelectOptionLabel
                                        label={String(account.title ?? account.name ?? account.id)}
                                        icon={typeof account.icon === 'string' ? account.icon : null}
                                        color={typeof account.color === 'string' ? account.color : 'var(--primary)'}
                                      />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </ActField>
                          <ActField label="Куда">
                            <Select value={composerToId} onValueChange={setComposerToId} disabled={!db || accounts.length < 2}>
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Куда" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Куда</SelectLabel>
                                  {accounts.map((account) => (
                                    <SelectItem key={String(account.id)} value={String(account.id)} textValue={String(account.title ?? account.name ?? account.id)}>
                                      <ActSelectOptionLabel
                                        label={String(account.title ?? account.name ?? account.id)}
                                        icon={typeof account.icon === 'string' ? account.icon : null}
                                        color={typeof account.color === 'string' ? account.color : 'var(--primary)'}
                                      />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </ActField>
                        </>
                      ) : (
                        <>
                          <ActField label="Счёт">
                            <Select value={composerAccountId} onValueChange={setComposerAccountId} disabled={!db || accounts.length === 0}>
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Счёт" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Счёт</SelectLabel>
                                  {accounts.map((account) => (
                                    <SelectItem key={String(account.id)} value={String(account.id)} textValue={String(account.title ?? account.name ?? account.id)}>
                                      <ActSelectOptionLabel
                                        label={String(account.title ?? account.name ?? account.id)}
                                        icon={typeof account.icon === 'string' ? account.icon : null}
                                        color={typeof account.color === 'string' ? account.color : 'var(--primary)'}
                                      />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </ActField>
                          <ActField label="Категория">
                            <Select value={composerCategoryId} onValueChange={setComposerCategoryId} disabled={!db || categories.length === 0}>
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue placeholder="Категория" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Категория</SelectLabel>
                                  {categories.map((category) => (
                                    <SelectItem key={String(category.id)} value={String(category.id)} textValue={String(category.title ?? category.name ?? category.id)}>
                                      <ActSelectOptionLabel
                                        label={String(category.title ?? category.name ?? category.id)}
                                        icon={typeof category.icon === 'string' ? category.icon : null}
                                        color={typeof category.color === 'string' ? category.color : 'var(--primary)'}
                                      />
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </ActField>
                        </>
                      )}
                      <ActField label="Сумма" htmlFor="transaction-edit-amount">
                        <ActComposerValueField
                          id="transaction-edit-amount"
                          ariaLabel="Сумма"
                          value={composerAmount}
                          suffix={currency}
                          inputKind="number"
                          placeholder="Сумма"
                          onCommit={setComposerAmount}
                        />
                      </ActField>
                    </ActTableBox>
                  </div>
                </ActModal>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </>
  );
}
