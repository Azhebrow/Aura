import { useMemo } from 'react';
import type { AuraRow } from '@/types/aura';
import type { AuraDatabase } from '@/types/aura';

export function normalizeDiaryDate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const m = /(\d{4}-\d{2}-\d{2})/.exec(raw);
  return m ? m[1] : null;
}

export function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function normalizeDiaryPresetText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim();
}

export function shortenText(text: string, max = 42): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

function diaryTextPreview(raw: unknown, max = 160, emptyLabel = 'Empty entry') {
  const plain = typeof raw === 'string' ? raw.replace(/<[^>]*>/g, ' ') : '';
  const s = plain.trim().replace(/\s+/g, ' ');
  if (!s) return emptyLabel;
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`;
}

type Params = {
  db: AuraDatabase | null;
  dateString: string;
  entriesSearch: string;
  entriesCategoryFilters: string[];
  dataRefreshTick: number;
  moodId: string;
  categoryId: string;
  emptyEntryLabel: string;
};

export function useDiaryData({
  db, dateString, entriesSearch, entriesCategoryFilters,
  dataRefreshTick, moodId, categoryId, emptyEntryLabel,
}: Params) {
  const moods = useMemo(() => {
    if (!db) return [] as AuraRow[];
    return db.getAll('cfg_diary_moods').sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
  }, [db]);

  const categories = useMemo(() => {
    if (!db) return [] as AuraRow[];
    return db.getAll('cfg_diary_categories')
      .filter((c) => c.id)
      .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0) || String(a.title ?? '').localeCompare(String(b.title ?? ''), 'ru'));
  }, [db]);

  const entryPresets = useMemo(() => {
    if (!db) return [] as AuraRow[];
    return db.getAll('cfg_diary_entry_presets')
      .filter((row) => row.id != null && Number(row.active ?? 1) !== 0)
      .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));
  }, [db, dataRefreshTick]);

  const moodById = useMemo(() => {
    const m = new Map<string, AuraRow>();
    for (const mo of moods) if (mo.id != null) m.set(String(mo.id), mo);
    return m;
  }, [moods]);

  const categoryById = useMemo(() => {
    const m = new Map<string, AuraRow>();
    for (const c of categories) if (c.id != null) m.set(String(c.id), c);
    return m;
  }, [categories]);

  const allDiaryEntries = useMemo(() => {
    if (!db) return [] as AuraRow[];
    return db.getAll('act_diary_entries')
      .filter((entry) => normalizeDiaryDate(entry.date))
      .sort((a, b) => {
        const aDate = normalizeDiaryDate(a.date) ?? '';
        const bDate = normalizeDiaryDate(b.date) ?? '';
        return bDate.localeCompare(aDate) || String(b.id ?? '').localeCompare(String(a.id ?? ''), 'ru');
      });
  }, [db, dataRefreshTick]);

  const selectedMonthEntries = useMemo(() => {
    const monthKey = dateString.slice(0, 7);
    return allDiaryEntries.filter((e) => normalizeDiaryDate(e.date)?.slice(0, 7) === monthKey);
  }, [allDiaryEntries, dateString]);

  const filteredDiaryEntries = useMemo(() => {
    const query = entriesSearch.trim().toLowerCase();
    const hasFilters = query.length > 0 || entriesCategoryFilters.length > 0;
    return (hasFilters ? allDiaryEntries : selectedMonthEntries).filter((entry) => {
      const catId = entry.category_id ? String(entry.category_id) : '';
      if (entriesCategoryFilters.length > 0 && !entriesCategoryFilters.includes(catId)) return false;
      if (!query) return true;
      const cat = catId ? categoryById.get(catId) : undefined;
      const mood = entry.mood_id ? moodById.get(String(entry.mood_id)) : undefined;
      const haystack = [
        String(entry.date ?? ''),
        diaryTextPreview(entry.text, 250, emptyEntryLabel),
        cat ? String(cat.title ?? cat.id ?? '') : '',
        mood ? String(mood.title ?? mood.id ?? '') : '',
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [allDiaryEntries, categoryById, entriesCategoryFilters, entriesSearch, moodById, selectedMonthEntries, emptyEntryLabel]);

  const activeEntryPreset = useMemo(() => {
    if (entryPresets.length === 0) return null;
    return entryPresets[hashString(dateString) % entryPresets.length] ?? entryPresets[0] ?? null;
  }, [dateString, entryPresets]);

  const moodIdx = useMemo(() => {
    const i = moods.findIndex((m) => String(m.id) === moodId);
    return i >= 0 ? i : 0;
  }, [moods, moodId]);

  return {
    moods, categories, entryPresets,
    moodById, categoryById,
    allDiaryEntries, selectedMonthEntries, filteredDiaryEntries,
    activeEntryPreset,
    moodIdx,
    activeMood: moods[moodIdx],
    activeCategory: categories.find((c) => String(c.id) === categoryId) ?? null,
  };
}
