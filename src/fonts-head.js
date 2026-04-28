import { GOOGLE_FONTS_STYLESHEET_HREF } from './config/fontFamilies.js';

const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = GOOGLE_FONTS_STYLESHEET_HREF;
document.head.appendChild(link);
