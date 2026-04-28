class ThemeSwitcher {
  constructor() {
    this.currentTheme = this.getStoredTheme() || 'dark';
    this.applyTheme(this.currentTheme);
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createSwitcher());
    } else {
      this.createSwitcher();
    }
  }

  getStoredTheme() {
    try {
      return localStorage.getItem('aura-theme');
    } catch (e) {
      return null;
    }
  }

  setStoredTheme(theme) {
    try {
      localStorage.setItem('aura-theme', theme);
    } catch (e) {
      console.warn('Не удалось сохранить тему в localStorage');
    }
  }

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    this.setStoredTheme(theme);
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  createSwitcher() {
    const switcher = document.createElement('button');
    switcher.className = 'btn';
    switcher.id = 'theme-switcher';
    switcher.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
    switcher.addEventListener('click', () => {
      this.toggleTheme();
      switcher.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
    });
    
    const header = document.querySelector('.page-header');
    if (header) {
      header.appendChild(switcher);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.themeSwitcher = new ThemeSwitcher();
});
