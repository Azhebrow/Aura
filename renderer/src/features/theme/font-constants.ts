/** Специальное значение: системный шрифт по умолчанию из `globals.css` (без принудительного Google Fonts). */
export const AURA_FONT_STANDARD = '__standard__' as const;

export const AURA_FONT_CHOICES = [
  AURA_FONT_STANDARD,
  'Philosopher',
  'Geologica',
  'Oswald',
  'Unbounded',
  'Roboto',
  'Open Sans',
  'Inter',
  'PT Sans',
  'Montserrat',
  'Lato',
  'Nunito',
  'Manrope',
  'Source Sans Pro',
  'Raleway',
  'Lora',
  'PT Serif',
  'Merriweather',
  'Playfair Display',
  'Crimson Text',
  'Roboto Mono',
  'Source Code Pro',
  'Fira Code',
  'Caveat',
] as const;

export type AuraFontFamily = (typeof AURA_FONT_CHOICES)[number];

export const DEFAULT_AURA_FONT: AuraFontFamily = AURA_FONT_STANDARD;

export function isAuraFontFamily(value: string | null | undefined): value is AuraFontFamily {
  if (!value) return false;
  return (AURA_FONT_CHOICES as readonly string[]).includes(value);
}
