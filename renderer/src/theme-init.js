// Theme initialization - runs before React loads
(function() {
  const validThemes = ['light', 'tinted', 'dark'];
  const savedTheme = localStorage.getItem('aura-theme');
  const theme = validThemes.includes(savedTheme) ? savedTheme : savedTheme === 'dim' ? 'tinted' : 'dark';
  const validAccents = ['fantasy', 'blue', 'teal', 'emerald', 'amber', 'rose', 'slate', 'graphite'];
  const savedAccent = localStorage.getItem('aura-accent-preset');
  const accent = validAccents.includes(savedAccent)
    ? savedAccent
    : savedAccent === 'violet' || savedAccent === 'indigo' || savedAccent === 'pink'
      ? 'fantasy'
      : savedAccent === 'cyan' || savedAccent === 'cobalt'
        ? 'blue'
        : savedAccent === 'forest' || savedAccent === 'lime'
          ? 'emerald'
          : savedAccent === 'orange'
            ? 'amber'
            : savedAccent === 'mono' || savedAccent === 'stone'
              ? 'graphite'
              : 'fantasy';
  const accentMap = {
    fantasy:  { light: 'oklch(0.55 0.16 292)', tinted: 'oklch(0.76 0.15 292)', dark: 'oklch(0.74 0.13 292)' },
    blue:     { light: 'oklch(0.52 0.24 248)', tinted: 'oklch(0.72 0.23 248)', dark: 'oklch(0.66 0.22 248)' },
    teal:     { light: 'oklch(0.55 0.18 188)', tinted: 'oklch(0.75 0.16 188)', dark: 'oklch(0.7 0.16 188)' },
    emerald:  { light: 'oklch(0.56 0.22 158)', tinted: 'oklch(0.75 0.2 158)', dark: 'oklch(0.7 0.2 158)' },
    amber:    { light: 'oklch(0.62 0.2 68)', tinted: 'oklch(0.8 0.19 68)', dark: 'oklch(0.78 0.2 68)' },
    rose:     { light: 'oklch(0.56 0.26 14)', tinted: 'oklch(0.72 0.24 14)', dark: 'oklch(0.7 0.24 14)' },
    slate:    { light: 'oklch(0.46 0.06 255)', tinted: 'oklch(0.72 0.085 255)', dark: 'oklch(0.72 0.08 255)' },
    graphite: { light: 'oklch(0.34 0.01 260)', tinted: 'oklch(0.76 0.012 260)', dark: 'oklch(0.74 0.01 260)' },
  };
  const primary = accentMap[accent][theme];
  const font = localStorage.getItem('aura-font');
  const validIconThemes = ['outline', 'plain', 'filled'];
  const savedIconTheme = localStorage.getItem('aura-icon-theme');
  const legacyIconTheme = savedIconTheme === 'minimal' ? 'plain' : savedIconTheme === 'gradient' ? 'filled' : savedIconTheme;
  const iconTheme = validIconThemes.includes(legacyIconTheme) ? legacyIconTheme : 'outline';
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.classList.toggle('dark', theme !== 'light');
  document.documentElement.setAttribute('data-icon-theme', iconTheme);
  document.documentElement.style.setProperty('--primary', primary);
  document.documentElement.style.setProperty('--ring', primary);
  document.documentElement.style.setProperty('--accent', primary);
  const bg = theme === 'light'
    ? 'oklch(0.972 0.004 255)'
    : theme === 'tinted'
      ? `color-mix(in oklab, oklch(0.295 0.012 255) 90%, ${primary} 10%)`
      : 'oklch(0.13 0 0)';
  const fg = theme === 'light' ? 'oklch(0.11 0.014 255)' : 'oklch(0.965 0.006 255)';
  document.documentElement.style.background = bg;
  document.documentElement.style.setProperty('--background', bg);
  document.documentElement.style.setProperty('--foreground', fg);
  if (font && font !== '__standard__') {
    const safeFont = font.replace(/'/g, '');
    const family = `'${safeFont}', ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`;
    document.documentElement.style.setProperty('--font-sans', family);
    document.documentElement.style.setProperty('--font-heading', family);
  }
})();
