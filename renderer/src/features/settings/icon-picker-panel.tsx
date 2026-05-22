import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, startTransition } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Bird,
  Bike,
  Box,
  Building2,
  Calendar,
  Camera,
  ChartNoAxesCombined,
  CircleHelp,
  Cloud,
  Cog,
  Compass,
  Cpu,
  CreditCard,
  FileText,
  Flame,
  Gamepad2,
  Globe,
  HeartPulse,
  Home,
  Image,
  LayoutGrid,
  Leaf,
  Mail,
  Music2,
  Palette,
  Pencil,
  PcCase,
  Pi,
  Search,
  Shield,
  ShoppingCart,
  Smile,
  Snowflake,
  Sparkles,
  Stethoscope,
  Tag,
  Text,
  Timer,
  Briefcase,
  UserRound,
  Users,
  Wallet,
  Waves,
  Wifi,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { loadIconsManifest } from '@/features/settings/load-icons-manifest';
import { cn } from '@/lib/utils';

type Props = {
  current?: string;
  onPick: (iconName: string) => void;
};

const CELL_MIN_WIDTH_PX = 52;
const GRID_GAP_PX = 6;
const ROW_HEIGHT_PX = 58;
const OVERSCAN_ROWS = 3;

const GROUP_ICON_MAP: Record<string, LucideIcon> = {
  accessibility: CircleHelp,
  account: UserRound,
  action: Sparkles,
  alert: AlertTriangle,
  animals: Bird,
  arrows: ArrowRight,
  audio: Music2,
  brands: Tag,
  buildings: Building2,
  charts: ChartNoAxesCombined,
  communication: Globe,
  connectivity: Wifi,
  controls: Cog,
  currency: Wallet,
  cursors: Pencil,
  data: Cpu,
  date: Calendar,
  design: Palette,
  development: Wrench,
  devices: PcCase,
  editing: FileText,
  emoji: Smile,
  emotion: Smile,
  files: FileText,
  finance: CreditCard,
  'food-beverage': Flame,
  'food beverage': Flame,
  gaming: Gamepad2,
  health: HeartPulse,
  home: Home,
  interface: LayoutGrid,
  layout: LayoutGrid,
  mail: Mail,
  math: Pi,
  media: Image,
  medical: Stethoscope,
  multimedia: Music2,
  nature: Leaf,
  navigation: Compass,
  network: Waves,
  notifications: Bell,
  people: Users,
  photography: Camera,
  photos: Image,
  science: Activity,
  seasons: Snowflake,
  security: Shield,
  shapes: Box,
  shopping: ShoppingCart,
  social: Users,
  sports: Bike,
  sustainability: Leaf,
  text: Text,
  time: Timer,
  tools: Briefcase,
  transport: Compass,
  transportation: Compass,
  travel: Compass,
  ui: LayoutGrid,
  user: UserRound,
  users: Users,
  weather: Cloud,
  general: CircleHelp,
};

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
  emoji: 'Эмодзи',
  emotion: 'Эмоции',
  files: 'Файлы',
  finance: 'Финансы',
  'food-beverage': 'Еда и напитки',
  'food beverage': 'Еда и напитки',
  gaming: 'Игры',
  health: 'Здоровье',
  home: 'Дом',
  interface: 'Интерфейс',
  layout: 'Макет',
  mail: 'Почта',
  math: 'Математика',
  media: 'Медиа',
  medical: 'Медицина',
  multimedia: 'Мультимедиа',
  nature: 'Природа',
  navigation: 'Навигация',
  network: 'Сеть',
  notifications: 'Оповещения',
  people: 'Люди',
  photography: 'Фотография',
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
  return group.trim().replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function GroupIcon({ group, active, firstIconName }: { group: string; active: boolean; firstIconName?: string }) {
  const key = group.trim().toLowerCase();
  const LIcon = GROUP_ICON_MAP[key];
  if (LIcon) {
    return <LIcon className="size-3.5 shrink-0" />;
  }
  if (firstIconName) {
    // Use currentColor via style so it reacts to active button text color
    return (
      <span
        className="size-3.5 shrink-0 inline-block"
        style={{
          WebkitMaskImage: `url("icons/${firstIconName}.svg")`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          backgroundColor: active ? 'var(--primary-foreground)' : 'var(--foreground)',
        }}
      />
    );
  }
  return <CircleHelp className="size-3.5 shrink-0" />;
}

export function IconPickerPanel({ current, onPick }: Props) {
  const [all, setAll] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [groupsMap, setGroupsMap] = useState<Record<string, string[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(320);
  const [viewportWidth, setViewportWidth] = useState(640);
  const scrollTopRef = useRef(0);
  const [scrollTop, setScrollTop] = useState(0);
  const rafRef = useRef<number | null>(null);
  const deferred = useDeferredValue(query);
  // isPending=true во время тяжёлых переходов (смена группы, загрузка)
  const [isPending, startGroupTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    loadIconsManifest()
      .then((manifest) => {
        if (cancelled) return;
        // Оборачиваем в startTransition — React рендерит асинхронно,
        // не блокируя UI. Скелетон остаётся пока рендер не завершится.
        startTransition(() => {
          setAll(manifest.icons);
          setGroups(manifest.groups);
          setGroupsMap(manifest.groupsMap);
          setIsLoading(false);
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    let list = all;
    if (activeGroup !== 'all') {
      list = list.filter((id) => (groupsMap[id] ?? []).includes(activeGroup));
    }
    if (!q) return list;
    return list.filter((id) => id.toLowerCase().includes(q));
  }, [activeGroup, all, deferred, groupsMap]);

  const columns = useMemo(() => {
    const width = Math.max(1, viewportWidth);
    return Math.max(1, Math.floor((width + GRID_GAP_PX) / (CELL_MIN_WIDTH_PX + GRID_GAP_PX)));
  }, [viewportWidth]);

  const rowCount = useMemo(() => Math.ceil(filtered.length / columns), [filtered.length, columns]);
  const startRow = useMemo(() => Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_PX) - OVERSCAN_ROWS), [scrollTop]);
  const endRow = useMemo(
    () => Math.min(rowCount, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT_PX) + OVERSCAN_ROWS),
    [rowCount, scrollTop, viewportHeight]
  );
  const startIndex = startRow * columns;
  const endIndex = Math.min(filtered.length, endRow * columns);
  const visible = useMemo(() => filtered.slice(startIndex, endIndex), [filtered, startIndex, endIndex]);
  const offsetY = startRow * ROW_HEIGHT_PX;
  const totalHeight = rowCount * ROW_HEIGHT_PX;

  const firstIconByGroup = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const id of all) {
      for (const group of groupsMap[id] ?? []) {
        if (!map[group]) map[group] = id;
      }
    }
    return map;
  }, [all, groupsMap]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const update = () => {
      setViewportHeight(node.clientHeight || 320);
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
  }, [activeGroup, deferred]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    scrollTopRef.current = top;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      setScrollTop(scrollTopRef.current);
    });
  };

  const handleGroupClick = (g: string) => {
    startGroupTransition(() => setActiveGroup(g));
  };

  const groupTabCn = (g: string, mobile?: boolean) => cn(
    mobile
      ? 'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium aura-tx-colors whitespace-nowrap'
      : 'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium aura-tx-colors text-left',
    activeGroup === g
      ? 'bg-primary text-primary-foreground'
      : 'text-[var(--aura-text-muted)] hover:bg-[var(--aura-action-hover-bg)] hover:text-foreground'
  );

  return (
    <div className="flex h-[min(72vh,42rem)] min-h-[24rem] w-full min-w-0 flex-col gap-2 overflow-hidden">
      {/* Поиск */}
      <div className="relative shrink-0">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск иконки…"
          className="h-9 pl-9 text-sm"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {loadError ? (
        <p className="text-destructive shrink-0 text-xs">{loadError}</p>
      ) : isLoading ? (
        /* Скелетон — показывается пока манифест грузится */
        <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-[var(--aura-border-soft)] p-2 animate-in fade-in duration-200">
          <div className="bg-muted/60 h-3 w-40 animate-pulse rounded" />
          <div className="grid flex-1 auto-rows-fr grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1.5 overflow-hidden">
            {Array.from({ length: 48 }).map((_, idx) => (
              <div key={idx} className="bg-muted/50 h-12 animate-pulse rounded-lg" style={{ animationDelay: `${(idx % 12) * 30}ms` }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] animate-in fade-in duration-200">
          {/* Панель групп — shrink-0 на мобильном, боковая колонка на sm+ */}
          <div className="flex shrink-0 min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--aura-border-soft)] sm:order-1 sm:shrink sm:flex-1">
            {/* Мобильный горизонтальный скролл */}
            <div className="flex min-w-0 overflow-x-auto p-1.5 sm:hidden" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-1">
                <button type="button" onClick={() => handleGroupClick('all')} className={groupTabCn('all', true)}>
                  <LayoutGrid className="size-3.5 shrink-0" />
                  <span>Все</span>
                </button>
                {groups.map((group) => (
                  <button key={group} type="button" onClick={() => handleGroupClick(group)} className={groupTabCn(group, true)}>
                    <GroupIcon group={group} active={activeGroup === group} firstIconName={firstIconByGroup[group]} />
                    <span>{groupLabel(group)}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Desktop вертикальный список */}
            <div className="hidden min-h-0 flex-1 flex-col overflow-y-auto p-1.5 sm:flex">
              <button type="button" onClick={() => handleGroupClick('all')} className={groupTabCn('all')}>
                <LayoutGrid className="size-3.5 shrink-0" />
                <span>Все</span>
              </button>
              {groups.map((group) => (
                <button key={group} type="button" onClick={() => handleGroupClick(group)} className={groupTabCn(group)}>
                  <GroupIcon group={group} active={activeGroup === group} firstIconName={firstIconByGroup[group]} />
                  <span>{groupLabel(group)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Сетка иконок — flex-1 чтобы заполнить остаток высоты */}
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--aura-border-soft)] sm:order-2">
            {/* Оверлей во время смены группы */}
            {isPending && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-[var(--aura-surface-panel)]/35 animate-in fade-in duration-100" />
            )}
            {filtered.length === 0 ? (
              <div className="text-muted-foreground flex h-full min-h-[11rem] items-center justify-center px-3 text-center text-sm">
                Иконки не найдены
              </div>
            ) : (
              <div
                ref={viewportRef}
                className="h-full overflow-auto"
                onScroll={handleScroll}
              >
                <div style={{ height: totalHeight }} className="relative p-1.5">
                  <div
                    className="grid gap-1.5"
                    style={{
                      transform: `translateY(${offsetY}px)`,
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
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
                            'flex h-[3.25rem] w-full items-center justify-center rounded-lg border aura-tx-colors',
                            active
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                              : 'border-[var(--aura-border-soft)]/60 bg-transparent hover:border-primary/30 hover:bg-[var(--aura-action-hover-bg)]'
                          )}
                        >
                          <AuraThemedIcon name={id} size={22} tint={active ? 'var(--primary)' : undefined} />
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
