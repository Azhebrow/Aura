import { resolveAuraIconFileBase } from '@/shared/lib/aura-icon-name';
import { getAppBaseUrl } from '@/shared/lib/base-url';

/** URL SVG из `public/icons` (как в `AuraPublicIcon`). */
export function getAuraPublicIconUrl(fileBase: string): string {
  // Use relative path that works with file:// protocol in Electron
  return `icons/${encodeURIComponent(fileBase)}.svg`;
}

export function getAuraPublicIconUrlFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const fb = resolveAuraIconFileBase(String(name));
  return fb ? getAuraPublicIconUrl(fb) : null;
}
