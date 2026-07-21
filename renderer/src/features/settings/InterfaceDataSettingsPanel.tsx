import { AppSettingsTechnicalCard } from '@/features/app-settings/AppSettingsTechnicalCard';
import { AppearanceSettingsCard } from '@/features/settings/AppearanceSettingsCard';
import { PageSectionsSettingsCard } from '@/features/settings/PageSectionsSettingsCard';
import { PointsSettingsCard } from '@/features/settings/PointsSettingsCard';

export function InterfaceDataSettingsPanel() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <AppearanceSettingsCard />
      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
        <PointsSettingsCard />
        <AppSettingsTechnicalCard />
      </div>
      <PageSectionsSettingsCard />
    </div>
  );
}
