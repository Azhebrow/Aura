import { resolveAuraIconFileBase } from '@/shared/lib/aura-icon-name';

/** URL SVG из `public/icons` (как в `AuraPublicIcon`). */
export function getAuraPublicIconUrl(fileBase: string): string {
  const base = import.meta.env.BASE_URL ?? './';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}icons/${encodeURIComponent(fileBase)}.svg`;
}

export function getAuraPublicIconUrlFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const fb = resolveAuraIconFileBase(String(name));
  return fb ? getAuraPublicIconUrl(fb) : null;
}
