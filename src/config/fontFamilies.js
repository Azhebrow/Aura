/**
 * Единый список шрифтов приложения (настройки + предзагрузка Google Fonts).
 * При добавлении/удалении пункта — обновить только этот файл.
 */
export const APP_FONT_CHOICES = [
  { value: 'Philosopher', text: 'Philosopher' },
  { value: 'Geologica', text: 'Geologica' },
  { value: 'Oswald', text: 'Oswald' },
  { value: 'Unbounded', text: 'Unbounded' },
  { value: 'Roboto', text: 'Roboto' },
  { value: 'Open Sans', text: 'Open Sans' },
  { value: 'Inter', text: 'Inter' },
  { value: 'PT Sans', text: 'PT Sans' },
  { value: 'Montserrat', text: 'Montserrat' },
  { value: 'Lato', text: 'Lato' },
  { value: 'Nunito', text: 'Nunito' },
  { value: 'Manrope', text: 'Manrope' },
  { value: 'Source Sans Pro', text: 'Source Sans Pro' },
  { value: 'Raleway', text: 'Raleway' },
  { value: 'Lora', text: 'Lora' },
  { value: 'PT Serif', text: 'PT Serif' },
  { value: 'Merriweather', text: 'Merriweather' },
  { value: 'Playfair Display', text: 'Playfair Display' },
  { value: 'Crimson Text', text: 'Crimson Text' },
  { value: 'Roboto Mono', text: 'Roboto Mono' },
  { value: 'Source Code Pro', text: 'Source Code Pro' },
  { value: 'Fira Code', text: 'Fira Code' },
  { value: 'Caveat', text: 'Caveat' }
];

const familyParams = APP_FONT_CHOICES.map(
  ({ value }) => `family=${value.replace(/ /g, '+')}:wght@400;700`
);

/** URL для подключения в head (см. src/fonts-head.js). */
export const GOOGLE_FONTS_STYLESHEET_HREF = `https://fonts.googleapis.com/css2?${familyParams.join('&')}&subset=cyrillic&display=swap`;
