/**
 * animation-classes.ts — All animation class names in one place.
 *
 * Law 4: "One animation for one action."
 * Import ANIM instead of writing class strings inline.
 *
 * @example
 * import { ANIM } from '@/shared/lib/animation-classes';
 * <div className={ANIM.enterFade}>…</div>
 * <li style={{ animationDelay: `${i * 30}ms` }} className={ANIM.enterFade}>…</li>
 */
export const ANIM = {
  // ─── Enter ─────────────────────────────────────────────────────────────────
  /** Fade in — for lists, panels, content that appears after load */
  enterFade:    'aura-enter-fade',
  /** Slide up + fade — for bottom sheets, modals appearing from below */
  enterSlideUp: 'aura-enter-slide-up',
  /** Scale in — for dialogs, dropdowns, popovers */
  enterScale:   'aura-enter-scale',

  // ─── Exit (Radix data-state='closed') ──────────────────────────────────────
  /** Fade out — for dialogs, tooltips */
  exitFade:       'aura-exit-fade',
  /** Slide down + fade out */
  exitSlideDown:  'aura-exit-slide-down',
  /** Scale out — mirrors enterScale */
  exitScale:      'aura-exit-scale',

  // ─── Transitions ──────────────────────────────────────────────────────────
  /** Color / bg / border transitions — hover states, theme changes */
  txColors:      'aura-tx-colors',
  /** Full interactive transition: color + opacity + transform */
  txInteractive: 'aura-tx-interactive',
  /** Surface transition: box-shadow + bg + border */
  txSurface:     'aura-tx-surface',
  /** Width transition — progress bars */
  txWidth:       'aura-tx-width',
  /** Transform transition — scale press feedback */
  txScale:       'aura-tx-scale',
  /** Shadow transition */
  txShadow:      'aura-tx-shadow',

  // ─── Actions / rows ───────────────────────────────────────────────────────
  /** Standard icon action: 32px, focus, hover, disabled-compatible */
  actionIcon:    'aura-action-icon',
  /** Soft filled action/control surface */
  actionSoft:    'aura-action-soft',
  /** Standard interactive row surface */
  rowInteractive:'aura-row-interactive',
  /** Destructive action treatment */
  dangerAction:  'aura-danger-action',
  /** Disabled action treatment */
  disabledAction:'aura-disabled-action',

  // ─── Loading ───────────────────────────────────────────────────────────────
  /** Animated skeleton placeholder */
  skeleton:      'aura-skeleton',
} as const;

export type AnimKey = keyof typeof ANIM;
