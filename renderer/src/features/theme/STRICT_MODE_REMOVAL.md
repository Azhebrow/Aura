# Strict / Operator Mode Removal Map

This mode is intentionally isolated as a removable visual layer.

## Core files

- `src/styles/strict-mode.css` — main visual override layer.
- `src/styles/globals.css` — imports `./strict-mode.css`.
- `src/features/theme/strict-mode.ts` — chart/runtime helpers.
- `src/features/theme/theme-constants.ts` — `LS_STRICT_MODE_KEY` and strict mode type.
- `src/features/theme/ThemeContext.tsx` — state, setter, localStorage persistence.
- `src/features/theme/apply-theme-dom.ts` — applies/removes `data-strict-mode`.
- `index.html` — early boot read of `aura-strict-mode` to avoid first-frame flash.
- `src/features/settings/AppearanceSettingsCard.tsx` — user-facing toggle.
- `scripts/audit-strict-mode.mjs` — optional consistency audit for this removal map.

## Visual hook classes

The mode mostly uses removable classes instead of business-logic branches:

- `aura-operator-row`
- `aura-operator-panel`
- `aura-operator-header`
- `aura-operator-toolbar`
- `aura-operator-control`
- `aura-operator-primary-action`
- `aura-operator-secondary-action`
- `aura-operator-kpi`
- `aura-operator-swatch`
- `aura-operator-signal`
- `aura-operator-visual`
- `aura-operator-table`
- `aura-operator-list-meter`

## Specialized strict hook classes

- `aura-date-strip`
- `aura-date-strip-cell`
- `aura-date-strip-meter`
- `aura-app-root`
- `aura-app-sidebar-shell`
- `aura-app-header-shell`
- `aura-app-content-shell`
- `aura-app-mobile-shell`
- `aura-shell-reveal`
- `aura-app-sidebar`
- `aura-app-header`
- `aura-app-main-scroll`
- `aura-shell-brand-button`
- `aura-shell-nav-item`
- `aura-mobile-dock`
- `aura-mobile-dock-item`
- `aura-mega-shell-card`
- `aura-mega-panel-header`
- `aura-card-section-header`
- `aura-section-title`
- `aura-section-actions`
- `aura-section-tab-header`
- `aura-section-tab-actions`
- `aura-strict-section-card`
- `aura-strict-section-title`
- `aura-strict-only-header`
- `aura-mode-switch-header`
- `aura-header-radio-group`
- `aura-header-radio-button`
- `aura-stats-toolbar`
- `aura-stats-control-grid`
- `aura-stats-control-cell`
- `aura-stats-control-label`
- `aura-stats-chip`
- `aura-task-category-header`
- `aura-task-category-meter`

## Removal steps

1. Remove `@import "./strict-mode.css";` from `src/styles/globals.css`.
2. Delete `src/styles/strict-mode.css`.
3. Delete `src/features/theme/strict-mode.ts`.
4. Remove `strictMode` state, setter, type, and storage key from the theme context/constants.
5. Remove `applyAuraStrictMode` and `data-strict-mode` handling from theme DOM sync and `index.html`.
6. Remove the toggle row from `AppearanceSettingsCard`.
7. Delete `scripts/audit-strict-mode.mjs`.
8. Optionally remove `aura-operator-*` class names from components. They are inert without the CSS layer, so this can be done later as cleanup.

## Current helper consumers

- `src/features/stats/stats-chart-utils.ts`
- `src/features/ranks/PointsAccumulationChart.tsx`

These imports should be removed or replaced with normal theme colors when deleting `strict-mode.ts`.

## Current visual hook consumers

These files currently contain `aura-operator-*` classes. Removing the CSS layer makes these classes inert; removing the class names themselves is optional cleanup.

- `src/features/act-system/ActSelectOptionLabel.tsx`
- `src/components/ui/list-item.tsx`
- `src/features/diary/NutritionDaySummaryBar.tsx`
- `src/features/home/TaskLine.tsx`
- `src/features/home/TasksCategoriesCard.tsx`
- `src/features/ranks/CurrentRankHero.tsx`
- `src/features/ranks/RankLadder.tsx`
- `src/features/rituals/GoalEditDialog.tsx`
- `src/features/rituals/GoalsManagementPanel.tsx`
- `src/features/rituals/RitualsChecklistPanel.tsx`
- `src/features/settings/AppearanceSettingsCard.tsx`
- `src/features/settings/CfgCategoryEditorDialog.tsx`
- `src/features/settings/CfgSectionCard.tsx`
- `src/features/settings/color-picker-panel.tsx`
- `src/features/stats/StatsControlsPanel.tsx`
- `src/features/stats/StatsPieView.tsx`
- `src/features/stats/StatsTableView.tsx`
- `src/features/timer/TimerFullscreenDialog.tsx`
- `src/features/timer/TimerSessionHero.tsx`
- `src/features/timer/TimerStatusPage.tsx`
- `src/features/transactions/TransactionsCard.tsx`
- `src/shared/ui/progress-fill-row.tsx`
- `src/widgets/date-strip/CalendarPickerDialog.tsx`

## Current specialized hook consumers

- `src/app/layout/RootLayout.tsx`
- `src/components/ui/header-segmented-radio.tsx`
- `src/features/app-settings/DatabaseManagementDialog.tsx`
- `src/features/home/TasksCategoriesCard.tsx`
- `src/features/ranks/PointsAccumulationChart.tsx`
- `src/features/stats/StatsControlsPanel.tsx`
- `src/pages/StatsOverviewPage.tsx`
- `src/shared/ui/mega-section-layout.ts`
- `src/shared/ui/mega-panel-header.tsx`
- `src/shared/ui/mode-switch-header.tsx`
- `src/widgets/app-chrome/AppHeader.tsx`
- `src/widgets/app-chrome/AppMainArea.tsx`
- `src/widgets/app-chrome/AppMobileDock.tsx`
- `src/widgets/app-chrome/AppSidebar.tsx`
- `src/widgets/app-chrome/ShellNavItem.tsx`
- `src/widgets/date-strip/CalendarPickerDialog.tsx`
- `src/widgets/date-strip/DateCellStrip.tsx`
- `src/widgets/page-section/PageSectionCard.tsx`
