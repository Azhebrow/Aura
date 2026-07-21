import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelectedDate } from '@/features/selected-date/selected-date-context';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { cn } from '@/lib/utils';
import { ActList, type ActItem } from '@/features/act-system';
import { IconWithBadge } from '@/components/ui/icon-with-badge';
import { useAsyncData } from '@/shared/hooks/use-async-data';
import { useFormMutation } from '@/shared/hooks/use-form-mutation';

type DailyPlansCardProps = {
  cardClassName?: string;
  contentClassName?: string;
};

const DEFAULT_PLAN_ICON = 'notebook';
const PLAN_ICON_OPTIONS = [
  'notebook',
  'calendar',
  'clock',
  'alarm-clock',
  'house',
  'shopping-cart',
  'utensils',
  'cooking-pot',
  'salad',
  'apple',
  'glass-water',
  'droplet',
  'washing-machine',
  'shirt',
  'brush',
  'bath',
  'bed',
  'person-standing',
  'bike',
  'dumbbell',
  'heart',
  'hand-heart',
  'phone',
  'book-open',
  'car',
  'bus',
  'package',
  'trash-2',
  'recycle',
  'sprout',
];

function firstGrapheme(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const Segmenter = Intl.Segmenter;
  if (Segmenter) {
    const segmenter = new Segmenter(undefined, { granularity: 'grapheme' });
    return segmenter.segment(trimmed)[Symbol.iterator]().next().value?.segment ?? '';
  }
  return Array.from(trimmed)[0] ?? '';
}

function normalizePlanIcon(value: string) {
  return value.trim() || DEFAULT_PLAN_ICON;
}

function isEmojiGrapheme(value: string) {
  if (!value) return false;
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value) || (/\p{Emoji}/u.test(value) && !/^[0-9#*]$/u.test(value));
}

function splitLeadingEmojiTitle(title: string) {
  const first = firstGrapheme(title);
  if (isEmojiGrapheme(first)) {
    return {
      icon: first,
      title: title.slice(first.length).trimStart(),
    };
  }
  return { icon: DEFAULT_PLAN_ICON, title };
}

export function DailyPlansCard({ cardClassName, contentClassName }: DailyPlansCardProps = {}) {
  const { t } = useTranslation('common');
  const { dateString } = useSelectedDate();
  const { db } = useAuraDb();
  const { data: rows, status, reload } = useAsyncData(
    (db) => db.getDailyPlans(dateString),
    [dateString],
    { events: ['task-progress'] }
  );
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState(DEFAULT_PLAN_ICON);
  const rowsList = useMemo(() => rows ?? [], [rows]);
  const { submit: submitMutation } = useFormMutation(
    (action: { kind: 'toggle' | 'add' | 'delete' | 'move'; payload?: unknown }) => {
      if (!db) return;
      if (action.kind === 'toggle') {
        const { id, completed } = action.payload as { id: string; completed: boolean };
        db.update('act_daily_plans', id, {
          completed: completed ? 1 : 0,
          updated_at: new Date().toISOString(),
        });
        reload({ silent: true });
        return;
      }
      if (action.kind === 'add') {
        const { dateString: ds, title: t, icon: i } = action.payload as { dateString: string; title: string; icon: string };
        const id = `plan_${ds.replace(/-/g, '')}_${Date.now()}`;
        const now = new Date().toISOString();
        db.create('act_daily_plans', {
          id,
          date: ds,
          icon: normalizePlanIcon(i),
          title: t,
          completed: 0,
          created_at: now,
        });
        reload({ silent: true });
        return;
      }
      if (action.kind === 'delete') {
        const { id } = action.payload as { id: string };
        db.delete('act_daily_plans', id);
        reload({ silent: true });
        return;
      }
      if (action.kind === 'move') {
        const { id, targetId } = action.payload as { id: string; targetId: string };
        const current = rowsList.find((row) => String(row.id) === id);
        const target = rowsList.find((row) => String(row.id) === targetId);
        if (!current || !target) return;
        db.update('act_daily_plans', id, {
          created_at: target.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        db.update('act_daily_plans', targetId, {
          created_at: current.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        reload({ silent: true });
      }
    },
    { eventType: 'task-progress' }
  );

  const toggle = (id: string, completed: boolean) => {
    submitMutation({ kind: 'toggle', payload: { id, completed } });
  };

  const add = () => {
    const parsed = splitLeadingEmojiTitle(title.trim());
    const nextTitle = parsed.title.trim();
    if (!nextTitle) return;
    const parsedHasIcon = parsed.icon !== DEFAULT_PLAN_ICON;
    submitMutation({ kind: 'add', payload: { dateString, title: nextTitle, icon: normalizePlanIcon(parsedHasIcon ? parsed.icon : icon) } });
    setTitle('');
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rowsList.length) return;
    submitMutation({
      kind: 'move',
      payload: {
        id: String(rowsList[index].id),
        targetId: String(rowsList[target].id),
      },
    });
  };
  const items: ActItem[] = rowsList.map((p, idx) => {
    const id = String(p.id);
    const done = p.completed === 1 || p.completed === true;
    const rawTitle = String(p.title ?? '');
    const legacy = splitLeadingEmojiTitle(rawTitle);
    const label = legacy.title || rawTitle;
    const storedIcon = typeof p.icon === 'string' && p.icon.trim() ? p.icon.trim() : '';
    const rowIcon = legacy.icon !== DEFAULT_PLAN_ICON ? legacy.icon : storedIcon || DEFAULT_PLAN_ICON;
    return {
      id,
      kind: 'daily-plan',
      title: label,
      state: done ? 'done' : 'default',
      checked: done,
      leading: isEmojiGrapheme(rowIcon) ? (
        <div className={cn('flex size-8 items-center justify-center rounded-md border border-soft bg-control text-base', done && 'opacity-55')} aria-hidden>
          {rowIcon}
        </div>
      ) : (
        <IconWithBadge
          iconName={rowIcon}
          tint="var(--muted-foreground)"
          size="lg"
          className={cn(done && 'opacity-55')}
          surfaceClassName="border-soft bg-control"
        />
      ),
      onToggle: (next) => toggle(id, next),
      onMoveUp: idx > 0 ? () => move(idx, -1) : undefined,
      onMoveDown: idx < rowsList.length - 1 ? () => move(idx, 1) : undefined,
      onDelete: () => submitMutation({ kind: 'delete', payload: { id } }),
    };
  });

  return (
    <>
      <div className={cn('flex min-h-0 flex-1 flex-col', cardClassName)}>
        <ActList
          items={items}
          loading={status === 'loading'}
          className={contentClassName}
          emptyTitle="На этот день пока нет планов."
          composer={{
            iconOptions: PLAN_ICON_OPTIONS,
            iconValue: icon,
            onIconChange: setIcon,
            inputValue: title,
            onInputChange: setTitle,
            placeholder: t('placeholder.new_item'),
            submitLabel: t('action.add'),
            submitDisabled: !splitLeadingEmojiTitle(title.trim()).title.trim(),
            onSubmit: add,
          }}
        />
      </div>
    </>
  );
}
