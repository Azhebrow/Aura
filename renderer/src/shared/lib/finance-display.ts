import type { AuraDatabase } from '@/types/aura';
import type { AuraRow } from '@/types/aura';

export type ResolvedTransaction = {
  typeKey: 'income' | 'expense' | 'transfer';
  typeLabel: string;
  title: string;
  iconName: string | null;
  accentColor: string | null;
  isCompulsiveExpense: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  income: 'Доход',
  expense: 'Расход',
  transfer: 'Перевод',
};

/** Упрощённый порт логики `TransactionsSection.getCategory` / `getIconAndColor`. */
export function resolveTransactionRow(db: AuraDatabase, t: AuraRow): ResolvedTransaction {
  const typeKey = String(t.type) as ResolvedTransaction['typeKey'];
  const typeLabel = TYPE_LABELS[typeKey] ?? typeKey;

  if (typeKey === 'transfer') {
    const acc = t.to_id ? db.getById('cfg_accounts', String(t.to_id)) : undefined;
    return {
      typeKey,
      typeLabel,
      title: acc ? String(acc.title ?? 'Перевод') : 'Перевод',
      iconName: acc && typeof acc.icon === 'string' ? acc.icon : 'arrow-right-left',
      accentColor: acc && typeof acc.color === 'string' ? String(acc.color) : null,
      isCompulsiveExpense: false,
    };
  }

  const table = typeKey === 'income' ? 'cfg_income_categories' : 'cfg_expense_categories';
  const cat = t.category_id ? db.getById(table, String(t.category_id)) : undefined;
  const title = cat ? String(cat.title ?? 'Категория') : 'Без категории';
  const iconName = cat && typeof cat.icon === 'string' ? cat.icon : null;
  const accentColor = cat && typeof cat.color === 'string' ? String(cat.color) : null;
  const isCompulsiveExpense = Boolean(
    typeKey === 'expense' && cat && String((cat as { type?: string }).type ?? '') === 'compulsive'
  );

  return {
    typeKey,
    typeLabel,
    title,
    iconName,
    accentColor,
    isCompulsiveExpense,
  };
}
