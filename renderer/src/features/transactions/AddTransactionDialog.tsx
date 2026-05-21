import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRightLeft,
  HandCoins,
  PiggyBank,
  Plus,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { useAuraDataRefresh } from '@/shared/hooks/use-aura-data-refresh';
import { currencySymbol, formatAmount } from '@/shared/lib/money';
import { runAuraMutation } from '@/shared/lib/run-aura-mutation';
import { ColoredAuraIcon } from '@/widgets/aura-icon/ColoredAuraIcon';
import type { AuraRow } from '@/types/aura';
import {
  ActField,
  ActAffixValueField,
  ActFormTable,
  ActModal,
  ActModalFooter,
  ActModeSwitch,
  ActTableBox,
} from '@/features/act/ActModal';

type Props = {
  dateString: string;
  currencyCode: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  initialTransaction?: AuraRow | null;
};

type TxType = 'expense' | 'income' | 'transfer';

function sortByUsage(rows: AuraRow[]) {
  return [...rows].sort((a, b) => {
    const ua = Number(a.usage_count) || 0;
    const ub = Number(b.usage_count) || 0;
    return ub - ua;
  });
}

function normalizeTxType(raw: unknown): TxType {
  if (raw === 'income' || raw === 'transfer') return raw;
  return 'expense';
}

export function AddTransactionDialog({
  dateString,
  currencyCode,
  open,
  onOpenChange,
  onSaved,
  initialTransaction,
}: Props) {
  const { t } = useTranslation('common');
  const { db } = useAuraDb();
  const dataTick = useAuraDataRefresh({ types: ['transaction'] });
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [fromAccountId, setFromAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openSeq, setOpenSeq] = useState(0);
  const isEditMode = Boolean(initialTransaction?.id);

  const categories = useMemo(() => {
    if (!db) return [];
    if (type === 'transfer') return [];
    const table = type === 'income' ? 'cfg_income_categories' : 'cfg_expense_categories';
    return sortByUsage(db.getAll(table));
  }, [db, type, dataTick]);

  const accounts = useMemo(() => {
    if (!db) return [];
    return db.getAll('cfg_accounts');
  // openSeq forces re-eval on dialog open so accountLabel re-reads fresh getById data
  }, [db, dataTick, openSeq]);
  useEffect(() => {
    if (!open) return;
    setOpenSeq((s) => s + 1);
    setError(null);
    if (initialTransaction?.id) {
      const initialType: TxType =
        initialTransaction.type === 'income'
          ? 'income'
          : initialTransaction.type === 'transfer'
            ? 'transfer'
            : 'expense';
      setType(initialType);
      setAmount(String(initialTransaction.amount ?? ''));
      setCategoryId(String(initialTransaction.category_id ?? ''));
      setAccountId(String(initialTransaction.account_id ?? ''));
      setFromAccountId(String(initialTransaction.from_id ?? ''));
      setToAccountId(String(initialTransaction.to_id ?? ''));
      return;
    }
    setAmount('');
    setCategoryId('');
    setAccountId('');
    setFromAccountId('');
    setToAccountId('');
    setType('expense');
  }, [open, initialTransaction]);

  useEffect(() => {
    if (!open || !categories.length) {
      setCategoryId('');
      return;
    }
    const first = String(categories[0].id ?? '');
    setCategoryId((prev) => (prev && categories.some((c) => String(c.id) === prev) ? prev : first));
  }, [open, categories]);

  useEffect(() => {
    if (!open || type === 'transfer') return;
    if (!accounts.length) {
      setAccountId('');
      return;
    }
    const first = String(accounts[0].id ?? '');
    setAccountId((prev) => (prev && accounts.some((a) => String(a.id) === prev) ? prev : first));
  }, [open, accounts, type, fromAccountId, toAccountId]);

  useEffect(() => {
    if (!open || type !== 'transfer') return;
    if (!accounts.length) {
      setFromAccountId('');
      setToAccountId('');
      return;
    }
    const accountIds = accounts.map((a) => String(a.id ?? ''));
    const first = accountIds[0] ?? '';
    const fallbackTo = accountIds.find((id) => id !== first) ?? first;
    const nextFrom = fromAccountId && accountIds.includes(fromAccountId) ? fromAccountId : first;
    let nextTo = toAccountId && accountIds.includes(toAccountId) ? toAccountId : fallbackTo;
    if (nextTo === nextFrom) {
      nextTo = accountIds.find((id) => id !== nextFrom) ?? nextFrom;
    }
    if (fromAccountId !== nextFrom) setFromAccountId(nextFrom);
    if (toAccountId !== nextTo) setToAccountId(nextTo);
  }, [open, accounts, type]);

  const submit = async () => {
    setError(null);
    const fail = (message: string) => {
      setError(message);
      window.alert(message);
    };
    if (!db) {
      fail(t('error.database_unavailable'));
      return;
    }
    const value = parseFloat(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      fail(t('error.amount_required'));
      return;
    }
    if (type === 'transfer') {
      if (accounts.length < 2) {
        fail(t('error.min_accounts_transfer'));
        return;
      }
      if (!fromAccountId || !toAccountId) {
        fail(t('error.select_accounts'));
        return;
      }
      if (fromAccountId === toAccountId) {
        fail(t('error.accounts_different'));
        return;
      }
    } else {
      if (!categoryId) {
        fail(t('error.select_category'));
        return;
      }
      if (!accountId) {
        fail(t('error.select_account'));
        return;
      }
    }

    const readAccountBalanceNow = (id: string) => Number(db.getById('cfg_accounts', id)?.balance) || 0;
    const readAccountLabel = (id: string) => {
      const row = db.getById('cfg_accounts', id);
      return String(row?.title ?? row?.name ?? id);
    };
    const oldType = normalizeTxType(initialTransaction?.type);
    const oldAmount = Number(initialTransaction?.amount) || 0;
    const oldAccountId = String(initialTransaction?.account_id ?? '');
    const oldFromId = String(initialTransaction?.from_id ?? '');
    const oldToId = String(initialTransaction?.to_id ?? '');
    const restoredDeltaForAccount = (id: string) => {
      if (!isEditMode || !id) return 0;
      if (oldType === 'expense' && oldAccountId === id) return oldAmount;
      if (oldType === 'income' && oldAccountId === id) return -oldAmount;
      if (oldType === 'transfer') {
        if (oldFromId === id) return oldAmount;
        if (oldToId === id) return -oldAmount;
      }
      return 0;
    };
    const availableForSpend = (id: string) => readAccountBalanceNow(id) + restoredDeltaForAccount(id);

    if (type === 'expense') {
      const available = availableForSpend(accountId);
      if (value > available + 1e-9) {
        const label = readAccountLabel(accountId);
        const amount = formatAmount(available, currencyCode);
        fail(t('error.insufficient_funds', { label, amount }));
        return;
      }
    }
    if (type === 'transfer') {
      const available = availableForSpend(fromAccountId);
      if (value > available + 1e-9) {
        const label = readAccountLabel(fromAccountId);
        const amount = formatAmount(available, currencyCode);
        fail(t('error.insufficient_funds_transfer', { label, amount }));
        return;
      }
    }

    const id =
      typeof initialTransaction?.id === 'string' && initialTransaction.id
        ? initialTransaction.id
        : `txn_${dateString.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    setBusy(true);
    try {
      const payload: AuraRow = {
        id,
        date: dateString,
        type,
        amount: value,
        account_id: type === 'transfer' ? null : accountId,
        from_id: type === 'transfer' ? fromAccountId : null,
        to_id: type === 'transfer' ? toAccountId : null,
        category_id: type === 'transfer' ? null : categoryId,
        description: null,
        created_at: initialTransaction?.created_at ?? now,
        updated_at: now,
      };
      runAuraMutation('transaction', () => {
        if (isEditMode) db.updateTransaction(id, payload);
        else db.addTransaction(payload);
      }, dateString);
      onOpenChange(false);
      onSaved();
    } catch (e) {
      fail(e instanceof Error ? e.message : t('error.save_error'));
    } finally {
      setBusy(false);
    }
  };

  const accountLabel = (a: AuraRow) => {
    const label = String(a.title ?? a.name ?? a.id);
    const fresh = db ? db.getById('cfg_accounts', String(a.id)) : null;
    const balance = Number(fresh?.balance ?? a.balance ?? 0);
    return `${label} (${formatAmount(balance, currencyCode)})`;
  };

  const isCompulsiveCategory = (c: AuraRow) =>
    type === 'expense' && String((c as { type?: string }).type ?? '') === 'compulsive';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ActModal
        icon={HandCoins}
        title={isEditMode ? t('dialog.edit_transaction') : t('dialog.add_transaction')}
        footer={
          <ActModalFooter
            onCancel={() => onOpenChange(false)}
            onSubmit={() => void submit()}
            submitDisabled={busy || !db}
            submitLabel={isEditMode ? t('action.update') : t('action.save')}
          />
        }
      >
        <ActTableBox>
          <ActFormTable>
            <ActField label={t('label_transaction.type')}>
            <ActModeSwitch
              value={type}
              onValueChange={(v) => setType(v as TxType)}
              options={[
                { value: 'expense', label: t('transaction.expense'), icon: TrendingDown },
                { value: 'income', label: t('transaction.income'), icon: TrendingUp },
                { value: 'transfer', label: t('transaction.transfer'), icon: ArrowRightLeft },
              ]}
            />
            </ActField>
            <ActField id="tx-amount" label={t('label_transaction.amount')}>
              <ActAffixValueField
                id="tx-amount"
                value={amount}
                suffix={currencySymbol(currencyCode)}
                inputKind="number"
                ariaLabel={t('label_transaction.amount')}
                autoStartEditKey={open ? openSeq : null}
                onCommit={setAmount}
              />
            </ActField>
            {type === 'transfer' ? (
              <ActField label={t('label_transaction.from')}>
                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                  <SelectTrigger className="h-9 w-full min-w-0 justify-center text-center">
                    <SelectValue placeholder={t('placeholder.select_source')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts.map((a) => {
                        const iconName = typeof a.icon === 'string' ? a.icon : null;
                        const tint =
                          typeof a.color === 'string' && a.color.trim() ? String(a.color) : 'var(--primary)';
                        const typ = String(a.type ?? '');
                        return (
                          <SelectItem key={String(a.id)} value={String(a.id)} tint={tint}>
                            <span className="flex items-center gap-2">
                              {iconName ? (
                                <ColoredAuraIcon name={iconName} tint={tint} size={16} className="shrink-0" />
                              ) : typ === 'savings' ? (
                                <PiggyBank className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              ) : (
                                <Wallet className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              )}
                              <span className="truncate">{accountLabel(a)}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </ActField>
            ) : (
              <ActField label={t('label_transaction.account')}>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-9 w-full min-w-0 justify-center text-center">
                    <SelectValue placeholder={t('label_transaction.account')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts.map((a) => {
                        const iconName = typeof a.icon === 'string' ? a.icon : null;
                        const tint =
                          typeof a.color === 'string' && a.color.trim() ? String(a.color) : 'var(--primary)';
                        const typ = String(a.type ?? '');
                        return (
                          <SelectItem key={String(a.id)} value={String(a.id)} tint={tint}>
                            <span className="flex items-center gap-2">
                              {iconName ? (
                                <ColoredAuraIcon name={iconName} tint={tint} size={16} className="shrink-0" />
                              ) : typ === 'savings' ? (
                                <PiggyBank className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              ) : (
                                <Wallet className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              )}
                              <span className="truncate">{accountLabel(a)}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </ActField>
            )}
            {type === 'transfer' ? (
              <ActField label={t('label_transaction.to')}>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger className="h-9 w-full min-w-0 justify-center text-center">
                    <SelectValue placeholder={t('placeholder.select_destination')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts.map((a) => {
                        const iconName = typeof a.icon === 'string' ? a.icon : null;
                        const tint =
                          typeof a.color === 'string' && a.color.trim() ? String(a.color) : 'var(--primary)';
                        const typ = String(a.type ?? '');
                        return (
                          <SelectItem key={String(a.id)} value={String(a.id)} tint={tint}>
                            <span className="flex items-center gap-2">
                              {iconName ? (
                                <ColoredAuraIcon name={iconName} tint={tint} size={16} className="shrink-0" />
                              ) : typ === 'savings' ? (
                                <PiggyBank className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              ) : (
                                <Wallet className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              )}
                              <span className="truncate">{accountLabel(a)}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </ActField>
            ) : null}
            {type !== 'transfer' ? (
              <ActField label={t('label_transaction.category')}>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-9 w-full min-w-0 justify-center text-center">
                    <SelectValue placeholder={t('label_transaction.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {categories.map((c) => {
                        const label = String(c.title ?? c.name ?? c.id);
                        const iconName = typeof c.icon === 'string' ? c.icon : null;
                        const tint =
                          typeof c.color === 'string' && c.color.trim() ? String(c.color) : 'var(--primary)';
                        return (
                          <SelectItem key={String(c.id)} value={String(c.id)} tint={tint}>
                            <span className="flex items-center gap-2">
                              {iconName ? (
                                <ColoredAuraIcon name={iconName} tint={tint} size={16} className="shrink-0" />
                              ) : (
                                <Tag className="text-muted-foreground size-4 shrink-0" aria-hidden />
                              )}
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate">{label}</span>
                                {isCompulsiveCategory(c) ? (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-xs leading-none text-amber-700 dark:text-amber-200"
                                    title={t('hint.impulsive_category')}
                                  >
                                    <AlertTriangle className="size-3" aria-hidden />
                                  </span>
                                ) : null}
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </ActField>
            ) : null}
          </ActFormTable>
        </ActTableBox>
        {error ? <p className="sr-only">{error}</p> : null}
      </ActModal>
    </Dialog>
  );
}

export function AddTransactionDialogTrigger({
  dateString,
  currencyCode,
  onSaved,
}: Omit<Props, 'open' | 'onOpenChange'>) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        {t('action.add')}
      </Button>
      <AddTransactionDialog
        dateString={dateString}
        currencyCode={currencyCode}
        open={open}
        onOpenChange={setOpen}
        onSaved={onSaved}
      />
    </>
  );
}
