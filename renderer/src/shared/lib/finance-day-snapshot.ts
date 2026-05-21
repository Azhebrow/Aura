import type { AuraDatabase, AuraRow } from '@/types/aura';

export type FinanceDaySnapshot = {
  date: string;
  accounts: AuraRow[];
  transactions: AuraRow[];
  transactionCount: number;
  dayNet: number;
  balance: number;
};

export function buildFinanceDaySnapshot(db: AuraDatabase | null, date: string): FinanceDaySnapshot {
  const accounts = db?.getAll('cfg_accounts') ?? [];
  const transactions = db?.getTransactions(date) ?? [];
  const dayNet = transactions.reduce((sum, row) => {
    const amount = Number(row.amount) || 0;
    const type = String(row.type ?? 'expense');
    if (type === 'income') return sum + amount;
    if (type === 'expense') return sum - amount;
    return sum;
  }, 0);
  return {
    date,
    accounts,
    transactions,
    transactionCount: transactions.length,
    dayNet,
    balance: accounts.reduce((sum, row) => sum + (Number(row.balance) || 0), 0),
  };
}
