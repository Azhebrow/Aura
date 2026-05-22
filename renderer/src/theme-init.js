// Theme initialization - runs before React loads
(function() {
  const validThemes = ['light', 'dim', 'dark'];
  const savedTheme = localStorage.getItem('aura-theme');
  const theme = validThemes.includes(savedTheme) ? savedTheme : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
})();
