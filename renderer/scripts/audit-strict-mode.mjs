#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const manifestPath = join(root, 'src/features/theme/STRICT_MODE_REMOVAL.md');

function read(relPath) {
  return readFileSync(join(root, relPath), 'utf8');
}

function fail(message) {
  console.error(`strict-mode audit failed: ${message}`);
  process.exitCode = 1;
}

function linesFromManifest(sectionTitle) {
  const manifest = readFileSync(manifestPath, 'utf8');
  const lines = manifest.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${sectionTitle}`);
  if (start < 0) return [];
  const out = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('## ')) break;
    const match = line.match(/^- `(.+)`/);
    if (match) out.push(match[1]);
  }
  return out.sort();
}

function rgFiles(pattern, ...paths) {
  let output = '';
  try {
    output = execFileSync('rg', ['-l', pattern, ...paths], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    if (error.status !== 1) throw error;
  }
  return output ? output.split(/\r?\n/).sort() : [];
}

if (!existsSync(manifestPath)) fail('missing STRICT_MODE_REMOVAL.md');

const requiredFiles = [
  'src/styles/strict-mode.css',
  'src/styles/globals.css',
  'src/features/theme/strict-mode.ts',
  'src/features/theme/theme-constants.ts',
  'src/features/theme/ThemeContext.tsx',
  'src/features/theme/apply-theme-dom.ts',
  'index.html',
  'src/features/settings/AppearanceSettingsCard.tsx',
];

for (const relPath of requiredFiles) {
  if (!existsSync(join(root, relPath))) fail(`missing core file ${relPath}`);
}

if (!read('src/styles/globals.css').includes('@import "./strict-mode.css";')) {
  fail('globals.css does not import strict-mode.css');
}

const strictCss = read('src/styles/strict-mode.css');
for (const requiredSelector of [
  "html[data-strict-mode='on']",
  "html.dark[data-strict-mode='on']",
  "html[data-theme='tinted'][data-strict-mode='on']",
  '.aura-operator-row',
  '.aura-operator-control',
  '.aura-operator-kpi',
  '.aura-operator-swatch',
  '.tabular-nums',
  "[data-slot='input']",
  "[data-slot='select-value']",
  '[data-act-affix-field]',
  'font-variant-numeric: tabular-nums slashed-zero',
  '.aura-data-fill',
  "[data-slot='progress-indicator']",
  '.aura-timer-halo',
  '.aura-task-checkbox-mark',
  "[style*='color: rgb']",
  "[style*='background-color: rgb']",
  "[style*='background: color-mix']",
  "[style*='box-shadow']",
]) {
  if (!strictCss.includes(requiredSelector)) fail(`strict-mode.css missing ${requiredSelector}`);
}

const operatorHookNames = Array.from(new Set(strictCss.match(/aura-operator-[a-z-]+/g) || [])).sort();
const manifestHookNames = linesFromManifest('Visual hook classes').sort();
if (JSON.stringify(operatorHookNames) !== JSON.stringify(manifestHookNames)) {
  fail(`visual hook class mismatch\ncss: ${operatorHookNames.join(', ')}\nmanifest: ${manifestHookNames.join(', ')}`);
}

const hookDefinitionMissing = operatorHookNames.filter((hookName) => {
  return !strictCss.includes(`.${hookName}`);
});
if (hookDefinitionMissing.length) {
  fail(`operator hooks are listed but not styled: ${hookDefinitionMissing.join(', ')}`);
}

const helperConsumers = rgFiles(
  "from '@/features/theme/strict-mode'",
  'src/features',
  'src/shared',
  'src/widgets',
  'src/components',
).filter((path) => path !== 'src/features/theme/STRICT_MODE_REMOVAL.md');
const manifestHelperConsumers = linesFromManifest('Current helper consumers');
if (JSON.stringify(helperConsumers) !== JSON.stringify(manifestHelperConsumers)) {
  fail(`helper consumers mismatch\nactual: ${helperConsumers.join(', ')}\nmanifest: ${manifestHelperConsumers.join(', ')}`);
}

const visualConsumers = rgFiles(
  'aura-operator-',
  'src/features',
  'src/shared',
  'src/widgets',
  'src/components',
).filter((path) => path !== 'src/features/theme/STRICT_MODE_REMOVAL.md');
const manifestVisualConsumers = linesFromManifest('Current visual hook consumers');
if (JSON.stringify(visualConsumers) !== JSON.stringify(manifestVisualConsumers)) {
  fail(`visual hook consumers mismatch\nactual: ${visualConsumers.join(', ')}\nmanifest: ${manifestVisualConsumers.join(', ')}`);
}

const specializedHookConsumers = rgFiles(
  'aura-date-strip|aura-app-root|aura-app-sidebar-shell|aura-app-header-shell|aura-app-content-shell|aura-app-mobile-shell|aura-shell-reveal|aura-app-sidebar|aura-app-header|aura-app-main-scroll|aura-shell-brand-button|aura-shell-nav-item|aura-mobile-dock|aura-mobile-dock-item|aura-mega-shell-card|aura-mega-panel-header|aura-card-section-header|aura-section-title|aura-section-actions|aura-section-tab-header|aura-section-tab-actions|aura-strict-section-card|aura-strict-section-title|aura-strict-only-header|aura-mode-switch-header|aura-header-radio-group|aura-header-radio-button|aura-stats-toolbar|aura-stats-control-grid|aura-stats-control-cell|aura-stats-control-label|aura-stats-chip|aura-task-category-header|aura-task-category-meter',
  'src/features',
  'src/shared',
  'src/widgets',
  'src/app',
  'src/components',
  'src/pages',
).filter((path) => path !== 'src/features/theme/STRICT_MODE_REMOVAL.md');
const manifestSpecializedHookConsumers = linesFromManifest('Current specialized hook consumers');
if (JSON.stringify(specializedHookConsumers) !== JSON.stringify(manifestSpecializedHookConsumers)) {
  fail(`specialized hook consumers mismatch\nactual: ${specializedHookConsumers.join(', ')}\nmanifest: ${manifestSpecializedHookConsumers.join(', ')}`);
}

const strictModeFiles = rgFiles(
  'data-strict-mode|aura-strict-mode|LS_STRICT_MODE_KEY|applyAuraStrictMode',
  'src',
  'index.html',
).filter((path) => path !== 'src/features/theme/STRICT_MODE_REMOVAL.md');
const allowedStrictModeFiles = [
  'index.html',
  'src/features/theme/ThemeContext.tsx',
  'src/features/theme/apply-theme-dom.ts',
  'src/features/theme/strict-mode.ts',
  'src/features/theme/theme-constants.ts',
  'src/styles/strict-mode.css',
].sort();
if (JSON.stringify(strictModeFiles) !== JSON.stringify(allowedStrictModeFiles)) {
  fail(`strict storage/dom wiring escaped the removable core\nactual: ${strictModeFiles.join(', ')}\nallowed: ${allowedStrictModeFiles.join(', ')}`);
}

if (process.exitCode) process.exit(process.exitCode);

console.log(`strict-mode audit ok: ${relative(root, manifestPath)}`);
