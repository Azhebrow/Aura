/** Пороги рангов — как в legacy `RankSection.js` (арт `public/ranks/{imageNumber}.png`). */
export type RankTier = {
  id: number;
  name: string;
  threshold: number;
  imageNumber: number;
  /** Лор-текст для страницы рангов (legacy). */
  description: string;
};

export const RANK_TIERS: RankTier[] = [
  {
    id: 1,
    name: 'НИКЧЁМНЫЙ',
    threshold: 0,
    imageNumber: 1,
    description:
      'Существо, едва именуемое человеком. Он есть, но словно в тени. Его дни серы, его поступки пусты. Он живёт на обочине собственной жизни, жалкий наблюдатель, который даже сам себе не нужен.',
  },
  {
    id: 2,
    name: 'ЛУЗЕР',
    threshold: 500,
    imageNumber: 2,
    description:
      'Он мечется, но всякое движение его бессильно. Он берётся за дело и бросает, обещает и предаёт слово. Жалкое подобие стремления — вечный проигравший, который хочет, но не умеет, да и не верит в себя.',
  },
  {
    id: 3,
    name: 'СЛАБАК',
    threshold: 1200,
    imageNumber: 3,
    description:
      'Он уже дерзает что-то начинать, но ломается при первом ударе. Его воля мягка, как сырая глина, его характер пуст. Он знает, что может больше, но трусость и лень душат его шаги.',
  },
  {
    id: 4,
    name: 'РАБОТЯГА',
    threshold: 2100,
    imageNumber: 4,
    description:
      'В нём просыпается грубая, но живая сила. Он ещё не владеет собой, но уже умеет терпеть. В поте лица, в мелких победах он куёт первый камень фундамента. Он ещё не велик, но перестал быть ничтожеством.',
  },
  {
    id: 5,
    name: 'УЧЕНИК',
    threshold: 3300,
    imageNumber: 5,
    description:
      'Он обретает уважение к дисциплине. Учит своё тело и ум подчиняться правилам, как солдат учит шагать в строю. Ему трудно, он спотыкается, но уже виден росток будущей силы.',
  },
  {
    id: 6,
    name: 'ВОИН',
    threshold: 4800,
    imageNumber: 6,
    description:
      'Каждый день для него — поле боя. Он сражается с ленью, со слабостью, с соблазнами, и хотя не всегда побеждает, он не сдаётся. В его глазах рождается сталь, в его поступках — порядок.',
  },
  {
    id: 7,
    name: 'ВОЛЯ',
    threshold: 6600,
    imageNumber: 7,
    description:
      'Это уже не просто человек, это орудие, закалённое в борьбе. Он не ищет оправданий — он ищет решения. Его слово имеет вес, его шаги несут уверенность. Его трудно сломать, почти невозможно остановить.',
  },
  {
    id: 8,
    name: 'СИЛА',
    threshold: 8700,
    imageNumber: 8,
    description:
      'Он перестаёт жить мелочами. Его движение становится поступью великана: он идёт вперёд, и всё вокруг вынуждено считаться с его волей. Он не доказывает — он существует как живая мощь.',
  },
  {
    id: 9,
    name: 'ЛЕГЕНДА',
    threshold: 11100,
    imageNumber: 9,
    description:
      'Он становится больше самого себя. Его образ — символ. Его жизнь — пример. Его имя уже не принадлежит ему одному: оно звучит в устах других как напоминание о том, что человек может быть выше слабости.',
  },
  {
    id: 10,
    name: 'АТЛАНТ',
    threshold: 13800,
    imageNumber: 10,
    description:
      'Он поднимает на плечи собственный мир и не дрогнет. В нём слились сталь и дух, привычка и честь, воля и судьба. Он — опора, несокрушимый столп, на котором держится смысл. Он не просто живёт — он стоит, и это стояние величественнее всякой победы.',
  },
];

/** Цвет «ореола» ранга (без анализа canvas — стабильно и быстро). */
export const RANK_AURA: Record<number, string> = {
  1: '220 10% 24%',  // темный
  2: '24 42% 40%',   // коричневый
  3: '158 58% 42%',  // изумрудный
  4: '212 78% 52%',  // синий
  5: '46 94% 56%',   // золотой
  6: '18 92% 54%',   // лавовый
  7: '338 72% 34%',  // кроваво-малиновый
  8: '292 68% 50%',  // фиолетово-красный
  9: '270 70% 55%',  // фиолетовый
  10: '191 92% 56%', // лазурный
};

/** HSL-цвет ореола ранга для инлайновых стилей и CSS-переменных. */
export function rankAuraHsl(tierId: number): string {
  const space = RANK_AURA[tierId] ?? RANK_AURA[1];
  return `hsl(${space})`;
}

export function rankImageSrc(imageNumber: number): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}ranks/${imageNumber}.png`;
}

export function formatRankPoints(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

export function getCurrentRank(points: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (points >= RANK_TIERS[i].threshold) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

export function getNextRank(current: RankTier): RankTier | null {
  const idx = RANK_TIERS.findIndex((r) => r.id === current.id);
  if (idx < 0 || idx >= RANK_TIERS.length - 1) return null;
  return RANK_TIERS[idx + 1];
}

export function rankProgress(points: number, current: RankTier, next: RankTier | null) {
  if (!next) return { pct: 100, needed: 0 };
  const lo = current.threshold;
  const hi = next.threshold;
  const span = Math.max(1, hi - lo);
  const pct = Math.min(100, Math.max(0, ((points - lo) / span) * 100));
  const needed = Math.max(0, hi - points);
  return { pct, needed };
}
