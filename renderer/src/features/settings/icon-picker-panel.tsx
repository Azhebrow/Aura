import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChartNoAxesCombined,
  CircleHelp,
  Cloud,
  Cog,
  Compass,
  Cpu,
  CreditCard,
  FileText,
  Gamepad2,
  Globe,
  HeartPulse,
  Home,
  Image,
  LayoutGrid,
  Music2,
  Palette,
  Search,
  Shield,
  ShoppingCart,
  Smile,
  Sparkles,
  Text,
  Timer,
  Briefcase,
  UserRound,
  Users,
  Wallet,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AuraThemedIcon } from '@/widgets/aura-icon/AuraThemedIcon';
import { loadIconsManifest } from '@/features/settings/load-icons-manifest';
import { cn } from '@/lib/utils';

type Props = {
  /** Current icon file name (without .svg). */
  current?: string;
  onPick: (iconName: string) => void;
};

const CELL_MIN_WIDTH_PX = 52;
const GRID_GAP_PX = 8;
const ROW_HEIGHT_PX = 60;
const OVERSCAN_ROWS = 4;
const GROUP_ICON_MAP: Record<string, LucideIcon> = {
  accessibility: CircleHelp,
  action: Sparkles,
  alert: AlertTriangle,
  arrows: ArrowRight,
  audio: Music2,
  charts: ChartNoAxesCombined,
  communication: Globe,
  controls: Cog,
  currency: Wallet,
  data: Cpu,
  date: Calendar,
  design: Palette,
  development: Wrench,
  editing: FileText,
  emotion: Smile,
  files: FileText,
  finance: CreditCard,
  gaming: Gamepad2,
  health: HeartPulse,
  home: Home,
  interface: LayoutGrid,
  layout: LayoutGrid,
  media: Image,
  navigation: Compass,
  network: Waves,
  people: Users,
  photos: Image,
  science: Activity,
  security: Shield,
  shopping: ShoppingCart,
  social: Users,
  sports: Activity,
  text: Text,
  time: Timer,
  tools: Briefcase,
  transport: Compass,
  travel: Compass,
  ui: LayoutGrid,
  user: UserRound,
  users: Users,
  weather: Cloud,
  general: CircleHelp,
};

function groupLabelOriginal(group: string): string {
  const parts = group
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(/\s+/g)
    .filter(Boolean);
  if (parts.length === 0) return 'Other';
  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function groupIcon(group: string): LucideIcon {
  const key = group.trim().toLowerCase();
  return GROUP_ICON_MAP[key] ?? CircleHelp;
}

export function IconPickerPanel({ current, onPick }: Props) {
  const [all, setAll] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [groupsMap, setGroupsMap] = useState<Record<string, string[]>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [booting, setBooting] = useState(true);
  const [isHydratingGrid, setIsHydratingGrid] = useState(true);
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(320);
  const [viewportWidth, setViewportWidth] = useState(640);
  const [scrollTop, setScrollTop] = useState(0);
  const deferred = useDeferredValue(query);

  useEffect(() => {
    const id = requestAnimationFrame(() => setBooting(false));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (isLoading || booting) {
      setIsHydratingGrid(true);
      return;
    }
    let cancelled = false;
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;
    let idleId: number | null = null;
    const hydrate = () => {
      if (!cancelled) setIsHydratingGrid(false);
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const ric = window.requestIdleCallback as (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
      idleId = ric(() => hydrate(), { timeout: 220 });
    } else {
      timeoutId = globalThis.setTimeout(hydrate, 90);
    }
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined' && idleId != null && 'cancelIdleCallback' in window) {
        const cancelRic = window.cancelIdleCallback as (handle: number) => void;
        cancelRic(idleId);
      }
      if (timeoutId != null) globalThis.clearTimeout(timeoutId);
    };
  }, [isLoading, booting]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    loadIconsManifest()
      .then((manifest) => {
        if (cancelled) return;
        setAll(manifest.icons);
        setGroups(manifest.groups);
        setGroupsMap(manifest.groupsMap);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (isHydratingGrid) return [];
    const q = deferred.trim().toLowerCase();
    let list = all;
    if (activeGroup !== 'all') {
      list = list.filter((id) => (groupsMap[id] ?? []).includes(activeGroup));
    }
    if (!q) return list;
    const out: string[] = [];
    for (const id of list) {
      if (id.toLowerCase().includes(q)) {
        out.push(id);
      }
    }
    return out;
  }, [activeGroup, all, deferred, groupsMap, isHydratingGrid]);

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

  const total = all.length;
  const firstIconByGroup = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const id of all) {
      const iconGroups = groupsMap[id] ?? [];
      for (const group of iconGroups) {
        if (!map[group]) map[group] = id;
      }
    }
    return map;
  }, [all, groupsMap]);

  const activeTotal = useMemo(() => {
    if (activeGroup === 'all') return all.length;
    let count = 0;
    for (const id of all) {
      if ((groupsMap[id] ?? []).includes(activeGroup)) count += 1;
    }
    return count;
  }, [activeGroup, all, groupsMap]);

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
  }, [isLoading, booting]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTop = 0;
    setScrollTop(0);
  }, [activeGroup, deferred]);

  return (
    <div className="flex h-[min(72vh,42rem)] min-h-[24rem] w-full min-w-0 flex-col gap-3 overflow-hidden">
      <div className="relative shrink-0">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name..."
          className="h-10 pl-9 text-sm"
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {loadError ? (
        <p className="text-destructive shrink-0 text-xs">{loadError}</p>
      ) : isLoading || booting || isHydratingGrid ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-border/60 bg-muted/10 p-2">
          <div className="bg-muted h-3 w-48 animate-pulse rounded" />
          <div className="grid flex-1 auto-rows-fr grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2 overflow-hidden">
            {Array.from({ length: 56 }).map((_, idx) => (
              <div key={idx} className="bg-muted h-12 rounded-lg border border-border/50 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground shrink-0 text-xs leading-relaxed">
            Total icons: {total}. In this group: {activeTotal}. Click an icon to pick it and close the picker.
          </p>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 md:grid-cols-[12.5rem_minmax(0,1fr)]">
            <ScrollArea className="min-h-0 rounded-xl border border-border/60 bg-muted/10 md:order-1">
              <div className="flex w-max min-w-full flex-row gap-1 p-2 md:w-auto md:min-w-0 md:flex-col">
                <Button
                  type="button"
                  size="sm"
                  variant={activeGroup === 'all' ? 'default' : 'secondary'}
                  className="h-8 justify-start gap-1.5 rounded-md px-2.5 text-xs"
                  onClick={() => setActiveGroup('all')}
                >
                  <LayoutGrid className="size-3.5 shrink-0" />
                  <span>All</span>
                </Button>
                {groups.map((group) => (
                  <Button
                    key={group}
                    type="button"
                    size="sm"
                    variant={activeGroup === group ? 'default' : 'outline'}
                    className="h-8 justify-start gap-1.5 rounded-md px-2.5 text-xs"
                    onClick={() => setActiveGroup(group)}
                  >
                    {(() => {
                      const Icon = groupIcon(group);
                      const fallbackIconName = firstIconByGroup[group];
                      return (
                        <>
                          {GROUP_ICON_MAP[group.trim().toLowerCase()] ? (
                            <Icon className="size-3.5 shrink-0" />
                          ) : fallbackIconName ? (
                            <AuraThemedIcon name={fallbackIconName} className="size-3.5 shrink-0" />
                          ) : (
                            <Icon className="size-3.5 shrink-0" />
                          )}
                          <span>{groupLabelOriginal(group)}</span>
                        </>
                      );
                    })()}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            <div className="min-h-0 rounded-xl border border-border/60 bg-muted/10 md:order-2">
              {filtered.length === 0 ? (
                <div className="text-muted-foreground flex h-full min-h-[11rem] items-center justify-center px-3 text-center text-sm">
                  No icons found for your filter.
                </div>
              ) : (
                <div
                  ref={viewportRef}
                  className="h-full overflow-auto"
                  onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                >
                  <div style={{ height: totalHeight }} className="relative p-2">
                    <div
                      className={cn(
                        'grid auto-rows-fr gap-2',
                        'motion-safe:[&_button]:transition-transform motion-safe:[&_button]:duration-aura-fast motion-safe:[&_button]:ease-aura',
                        'motion-safe:[&_button]:hover:scale-[1.03] motion-safe:[&_button]:active:scale-[0.98]'
                      )}
                      data-columns={columns}
                      style={{
                        transform: `translateY(${offsetY}px)`,
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      }}
                    >
                      {visible.map((id) => {
                        const active = current === id;
                        return (
                          <Button
                            key={id}
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={id}
                            aria-label={id}
                            className={cn(
                              'border-border/70 h-12 w-full rounded-lg border bg-background/90 p-0 shadow-sm',
                              'items-center justify-center [&_[role=img]]:mx-auto',
                              active && 'border-primary ring-primary/35 ring-2'
                            )}
                            onClick={() => onPick(id)}
                          >
                            <AuraThemedIcon name={id} className="size-6 shrink-0" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
