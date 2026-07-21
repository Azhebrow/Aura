import { useDeferredValue, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { LayoutGrid, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { loadIconsManifest } from '@/features/settings/load-icons-manifest';
import { cn } from '@/lib/utils';

type Props = {
  current?: string;
  onPick: (iconName: string) => void;
};

const CELL_MIN_WIDTH_PX = 58;
const GRID_GAP_PX = 6;
const ROW_HEIGHT_PX = 62;
const OVERSCAN_ROWS = 2;

const GROUP_LABELS: Record<string, string> = {
  accessibility: 'Доступность',
  account: 'Аккаунт',
  action: 'Действия',
  alert: 'Уведомления',
  animals: 'Животные',
  arrows: 'Стрелки',
  audio: 'Аудио',
  brands: 'Бренды',
  buildings: 'Здания',
  charts: 'Графики',
  communication: 'Общение',
  connectivity: 'Связь',
  controls: 'Управление',
  currency: 'Валюта',
  cursors: 'Курсоры',
  data: 'Данные',
  date: 'Дата',
  design: 'Дизайн',
  development: 'Разработка',
  devices: 'Устройства',
  editing: 'Редактор',
  emoji: 'Эмоции',
  emotion: 'Эмоции',
  files: 'Файлы',
  finance: 'Финансы',
  'food-beverage': 'Еда',
  'food beverage': 'Еда',
  gaming: 'Игры',
  health: 'Здоровье',
  home: 'Дом',
  interface: 'Интерфейс',
  layout: 'Макет',
  mail: 'Почта',
  math: 'Математика',
  media: 'Медиа',
  medical: 'Медицина',
  multimedia: 'Медиа',
  nature: 'Природа',
  navigation: 'Навигация',
  network: 'Сеть',
  notifications: 'Оповещения',
  people: 'Люди',
  photography: 'Фото',
  photos: 'Фото',
  science: 'Наука',
  seasons: 'Сезоны',
  security: 'Безопасность',
  shapes: 'Фигуры',
  shopping: 'Покупки',
  social: 'Соцсети',
  sports: 'Спорт',
  sustainability: 'Экология',
  text: 'Текст',
  time: 'Время',
  tools: 'Инструменты',
  transport: 'Транспорт',
  transportation: 'Транспорт',
  travel: 'Путешествия',
  ui: 'UI',
  user: 'Пользователь',
  users: 'Пользователи',
  weather: 'Погода',
  general: 'Общее',
};

function groupLabel(group: string): string {
  const key = group.trim().toLowerCase();
  if (GROUP_LABELS[key]) return GROUP_LABELS[key];
  return group.trim().replace(/[_-]+/g, ' ');
}

export function IconPickerPanel({ current, onPick }: Props) {
  const [all, setAll] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [groupIndex, setGroupIndex] = useState<Record<string, Set<string>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const scrollTopRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(360);
  const [viewportWidth, setViewportWidth] = useState(640);
  const [scrollTop, setScrollTop] = useState(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    loadIconsManifest()
      .then((manifest) => {
        if (cancelled) return;
        const nextIndex: Record<string, Set<string>> = {};
        for (const group of manifest.groups) nextIndex[group] = new Set();
        for (const icon of manifest.icons) {
          for (const group of manifest.groupsMap[icon] ?? ['general']) {
            (nextIndex[group] ??= new Set()).add(icon);
          }
        }
        startTransition(() => {
          setAll(manifest.icons);
          setGroups(manifest.groups);
          setGroupIndex(nextIndex);
          setIsLoading(false);
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : String(error));
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const groupSet = activeGroup === 'all' ? null : groupIndex[activeGroup] ?? new Set<string>();
    const base = groupSet ? all.filter((id) => groupSet.has(id)) : all;
    if (!q) return base;
    return base.filter((id) => id.includes(q));
  }, [activeGroup, all, deferredQuery, groupIndex]);

  const columns = useMemo(() => {
    const width = Math.max(1, viewportWidth);
    return Math.max(3, Math.floor((width + GRID_GAP_PX) / (CELL_MIN_WIDTH_PX + GRID_GAP_PX)));
  }, [viewportWidth]);

  const rowCount = Math.ceil(filtered.length / columns);
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_PX) - OVERSCAN_ROWS);
  const endRow = Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT_PX) + OVERSCAN_ROWS);
  const startIndex = startRow * columns;
  const endIndex = Math.min(filtered.length, endRow * columns);
  const visible = filtered.slice(startIndex, endIndex);
  const offsetY = startRow * ROW_HEIGHT_PX;
  const totalHeight = rowCount * ROW_HEIGHT_PX;

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const update = () => {
      setViewportHeight(node.clientHeight || 360);
      setViewportWidth(node.clientWidth || 640);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [isLoading]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTop = 0;
    scrollTopRef.current = 0;
    setScrollTop(0);
  }, [activeGroup, deferredQuery]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    scrollTopRef.current = event.currentTarget.scrollTop;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setScrollTop(scrollTopRef.current);
    });
  };

  const pickGroup = (group: string) => {
    startTransition(() => setActiveGroup(group));
  };

  const groupButtonCn = (group: string) => cn(
    'inline-flex h-7 shrink-0 items-center justify-center rounded-md px-2.5 text-xs font-medium aura-tx-colors sm:w-full sm:justify-start',
    activeGroup === group
      ? 'bg-foreground text-background'
      : 'text-dim hover:bg-hover hover:text-foreground'
  );

  return (
    <div className="flex h-[min(74vh,42rem)] min-h-[24rem] w-full min-w-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-soft px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск"
            className="h-8 rounded-md border-0 bg-control/45 pl-8 text-sm shadow-none focus-visible:bg-control/65 focus-visible:ring-1"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <span className="hidden shrink-0 text-xs tabular-nums text-faint sm:block">
          {filtered.length}
        </span>
      </div>

      {loadError ? (
        <p className="px-3 py-2 text-sm text-destructive">{loadError}</p>
      ) : isLoading ? (
        <div className="grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(3.625rem,1fr))] gap-1.5 overflow-hidden p-3">
          {Array.from({ length: 48 }).map((_, index) => (
            <div key={index} className="h-14 rounded-lg bg-control/45 motion-safe:animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 sm:grid-cols-[9rem_minmax(0,1fr)] sm:grid-rows-1">
          <div className="min-w-0 border-b border-soft sm:border-b-0 sm:border-r">
            <div className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] sm:h-full sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:p-3 [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => pickGroup('all')} className={groupButtonCn('all')}>
                <LayoutGrid className="mr-1.5 size-3.5 shrink-0" />
                Все
              </button>
              {groups.map((group) => (
                <button key={group} type="button" onClick={() => pickGroup(group)} className={groupButtonCn(group)}>
                  <span className="truncate">{groupLabel(group)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 min-w-0 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex h-full min-h-[12rem] items-center justify-center px-3 text-center text-sm text-dim">
                Ничего не найдено
              </div>
            ) : (
              <div ref={viewportRef} className="h-full overflow-auto p-3 [scrollbar-gutter:stable]" onScroll={handleScroll}>
                <div style={{ height: totalHeight }} className="relative">
                  <div
                    className="grid"
                    style={{
                      gap: GRID_GAP_PX,
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      transform: `translate3d(0, ${offsetY}px, 0)`,
                      willChange: 'transform',
                    }}
                  >
                    {visible.map((id) => {
                      const active = current === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          title={id}
                          aria-label={id}
                          onClick={() => onPick(id)}
                          className={cn(
                            'flex h-14 items-center justify-center rounded-lg border border-transparent aura-tx-colors',
                            active
                              ? 'border-primary/35 bg-foreground text-background shadow-xs'
                              : 'text-foreground hover:border-soft hover:bg-hover'
                          )}
                        >
                          <AuraThemedIcon name={id} size={23} tint={active ? 'var(--background)' : 'currentColor'} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
