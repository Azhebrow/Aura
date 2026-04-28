import { AURA_FONT_CHOICES, AURA_FONT_STANDARD } from '@/features/theme/font-constants';

const AURA_GOOGLE_FONTS_LINK_ID = 'aura-google-fonts-link';

function createGoogleFontsHref(): string {
  const params = AURA_FONT_CHOICES.filter((font) => font !== AURA_FONT_STANDARD).map(
    (font) => `family=${font.replaceAll(' ', '+')}:wght@400;700`
  );
  return `https://fonts.googleapis.com/css2?${params.join('&')}&subset=cyrillic&display=swap`;
}

export function ensureAuraFontsStylesheet() {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById(AURA_GOOGLE_FONTS_LINK_ID);
  if (existing) return;
  const link = document.createElement('link');
  link.id = AURA_GOOGLE_FONTS_LINK_ID;
  link.rel = 'stylesheet';
  link.href = createGoogleFontsHref();
  document.head.appendChild(link);
}
