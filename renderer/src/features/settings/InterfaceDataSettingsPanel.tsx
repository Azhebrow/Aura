import { AppSettingsTechnicalCard } from '@/features/app-settings/AppSettingsTechnicalCard';
import { AppearanceSettingsCard } from '@/features/settings/AppearanceSettingsCard';
import { PageSectionsSettingsCard } from '@/features/settings/PageSectionsSettingsCard';
import { PointsSettingsCard } from '@/features/settings/PointsSettingsCard';
import { SidebarWidgetSettingsCard } from '@/features/settings/SidebarWidgetSettingsCard';

export function InterfaceDataSettingsPanel() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
      <AppearanceSettingsCard />
      <PointsSettingsCard />
      <AppSettingsTechnicalCard />
      <PageSectionsSettingsCard />
      <SidebarWidgetSettingsCard />
    </div>
  );
}
