import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Eye, Sunrise, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuraDb } from '@/shared/hooks/use-aura-db';
import { getPageSectionsFromSettings } from '@/shared/lib/page-sections-visibility';
import { PageFrame } from '@/widgets/page-frame/PageFrame';
import type { AuraRow } from '@/types/aura';
import {
  MEGA_PAGEFRAME_CN,
  MEGA_PAGEFRAME_CONTENT_CN,
  MEGA_SHELL_CARD_CN,
  MEGA_SHELL_CONTENT_CN,
} from '@/shared/ui/mega-section-layout';
import { MobilePageShell } from '@/shared/ui/mobile';
import { GoalsManagementPanel } from '@/features/rituals/GoalsManagementPanel';
import { RitualsChecklistPanel } from '@/features/rituals/RitualsChecklistPanel';
import { VowsSingleViewer } from '@/features/rituals/VowsSingleViewer';

function LeftStackRitualsVows({
  showRituals,
  showVows,
  vows,
}: {
  showRituals: boolean;
  showVows: boolean;
  vows: AuraRow[];
}) {
  useAuraDb();
  if (!showRituals && !showVows) return null;

  // Both sections visible: split equally
  if (showRituals && showVows) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col divide-y divide-border/60 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <RitualsChecklistPanel />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <VowsSingleViewer vows={vows} />
        </div>
      </div>
    );
  }

  // Only rituals
  if (showRituals) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <RitualsChecklistPanel />
      </div>
    );
  }

  // Only vows
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <VowsSingleViewer vows={vows} />
    </div>
  );
}

export function RitualsPage() {
  const { db } = useAuraDb();
  const [mobileTab, setMobileTab] = useState<'rituals' | 'vows' | 'goals'>('rituals');

  const visibility = useMemo(() => {
    if (!db) return getPageSectionsFromSettings(null);
    return getPageSectionsFromSettings(db.getAppSettings());
  }, [db]);

  const showRituals = visibility.rituals.rituals !== false;
  const showVows = visibility.rituals.vows !== false;
  const showGoals = visibility.rituals.goals !== false;

  const vows = useMemo(() => {
    if (!db) return [] as AuraRow[];
    return db.getAll('cfg_vows').filter((v) => v.id);
  }, [db]);

  if (!showRituals && !showVows && !showGoals) {
    return (
      <PageFrame>
        <p className="text-muted-foreground text-sm">Включите секции страницы «Ритуалы» в настройках приложения.</p>
      </PageFrame>
    );
  }

  const showLeft = showRituals || showVows;
  const twoColumns = showLeft && showGoals;
  const mobileSections = [
    showRituals ? { id: 'rituals' as const, label: 'Ритуалы', Icon: Sunrise, content: <RitualsChecklistPanel /> } : null,
    showVows ? { id: 'vows' as const, label: 'Обеты', Icon: Eye, content: <VowsSingleViewer vows={vows} /> } : null,
    showGoals ? { id: 'goals' as const, label: 'Цели', Icon: Target, content: <GoalsManagementPanel /> } : null,
  ].filter(Boolean) as Array<{ id: 'rituals' | 'vows' | 'goals'; label: string; Icon: typeof Sunrise; content: ReactNode }>;

  useEffect(() => {
    if (!mobileSections.some((section) => section.id === mobileTab)) {
      setMobileTab(mobileSections[0]?.id ?? 'rituals');
    }
  }, [mobileSections, mobileTab]);

  return (
    <PageFrame className={MEGA_PAGEFRAME_CN} contentClassName={MEGA_PAGEFRAME_CONTENT_CN}>
      <Card className={MEGA_SHELL_CARD_CN}>
        <CardContent className={`${MEGA_SHELL_CONTENT_CN} aura-content-fade-in`}>
          <MobilePageShell sections={mobileSections} value={mobileTab} onChange={setMobileTab} />
          {twoColumns ? (
            <div className="hidden min-h-0 flex-1 overflow-hidden lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:divide-x lg:divide-border/60">
              <LeftStackRitualsVows showRituals={showRituals} showVows={showVows} vows={vows} />
              <GoalsManagementPanel />
            </div>
          ) : showLeft ? (
            <div className="hidden min-h-0 flex-1 overflow-hidden lg:flex">
              <LeftStackRitualsVows showRituals={showRituals} showVows={showVows} vows={vows} />
            </div>
          ) : (
            <div className="hidden min-h-0 flex-1 overflow-hidden lg:flex">
              <GoalsManagementPanel />
            </div>
          )}
        </CardContent>
      </Card>
    </PageFrame>
  );
}
