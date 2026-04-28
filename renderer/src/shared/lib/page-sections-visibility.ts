/**
 * Видимость секций страниц — зеркало `PageSectionsVisibilityService` (JSON в app_settings.page_sections_visibility).
 */

export type DiaryVisibility = {
  entryPanel: boolean;
  contentEntries: boolean;
  contentNutrition: boolean;
};

export type PageSectionsVisibility = {
  home: Record<string, boolean>;
  rituals: Record<string, boolean>;
  diary: DiaryVisibility;
  ranks: Record<string, boolean>;
};

const PAGE_SECTION_DEFAULTS: PageSectionsVisibility = {
  home: {
    tasksCategories: true,
    transactions: true,
    dailyPlans: true,
    categoryProgressChart: true,
  },
  rituals: {
    rituals: true,
    vows: true,
    goals: true,
  },
  diary: {
    entryPanel: true,
    contentEntries: true,
    contentNutrition: true,
  },
  ranks: {
    rank: true,
    pointsHistory: true,
  },
};

function deepMergeVisibility(stored: unknown): PageSectionsVisibility {
  const out = JSON.parse(JSON.stringify(PAGE_SECTION_DEFAULTS)) as PageSectionsVisibility;
  if (!stored || typeof stored !== 'object') return out;
  const s = stored as Record<string, Record<string, boolean>>;
  for (const page of Object.keys(PAGE_SECTION_DEFAULTS) as (keyof PageSectionsVisibility)[]) {
    if (s[page] && typeof s[page] === 'object') {
      for (const key of Object.keys(PAGE_SECTION_DEFAULTS[page])) {
        if (Object.prototype.hasOwnProperty.call(s[page], key)) {
          (out[page] as Record<string, boolean>)[key] = Boolean(s[page][key]);
        }
      }
    }
  }
  return out;
}

export function enforceVisibilityInvariants(v: PageSectionsVisibility): PageSectionsVisibility {
  if (!v.diary.contentEntries && !v.diary.contentNutrition) {
    v.diary.contentEntries = true;
  }
  if (!v.ranks.rank && !v.ranks.pointsHistory) {
    v.ranks.rank = true;
  }
  return v;
}

export function parsePageSectionsVisibility(raw: unknown): PageSectionsVisibility {
  if (raw == null || raw === '') return deepMergeVisibility(null);
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return enforceVisibilityInvariants(deepMergeVisibility(parsed));
  } catch {
    return deepMergeVisibility(null);
  }
}

export function getPageSectionsFromSettings(settings: unknown): PageSectionsVisibility {
  const s = settings as { page_sections_visibility?: unknown } | null;
  return parsePageSectionsVisibility(s?.page_sections_visibility);
}
