/** Специальное значение: системный шрифт по умолчанию из `globals.css` (без принудительного Google Fonts). */
export const AURA_FONT_STANDARD = '__standard__' as const;

export const AURA_FONT_CHOICES = [
  AURA_FONT_STANDARD,
  'Inter',
  'Manrope',
  'Onest',
  'IBM Plex Sans',
  'Noto Sans',
  'Geologica',
  'Rubik',
  'Nunito Sans',
  'Commissioner',
  'JetBrains Mono',
  'IBM Plex Mono',
  'Fira Sans',
  'Mulish',
  'Montserrat',
  'Exo 2',
  'Unbounded',
  'Philosopher',
  'Lora',
] as const;

export type AuraFontFamily = (typeof AURA_FONT_CHOICES)[number];

export const AURA_GOOGLE_FONT_WEIGHTS: Partial<Record<Exclude<AuraFontFamily, typeof AURA_FONT_STANDARD>, string>> = {
  Inter: '400;500;600;700',
  Manrope: '400;500;600;700;800',
  Onest: '400;500;600;700;800',
  'IBM Plex Sans': '400;500;600;700',
  'Noto Sans': '400;500;600;700;800',
  Geologica: '400;500;600;700;800',
  Rubik: '400;500;600;700;800',
  'Nunito Sans': '400;500;600;700;800',
  Commissioner: '400;500;600;700;800',
  'JetBrains Mono': '400;500;600;700;800',
  'IBM Plex Mono': '400;500;600;700',
  'Fira Sans': '400;500;600;700',
  Mulish: '400;500;600;700;800',
  Montserrat: '400;500;600;700;800',
  'Exo 2': '400;500;600;700;800',
  Unbounded: '400;500;600;700;800',
  Philosopher: '400;700',
  Lora: '400;500;600;700',
};

export const DEFAULT_AURA_FONT: AuraFontFamily = AURA_FONT_STANDARD;

export function isAuraFontFamily(value: string | null | undefined): value is AuraFontFamily {
  if (!value) return false;
  return (AURA_FONT_CHOICES as readonly string[]).includes(value);
}
