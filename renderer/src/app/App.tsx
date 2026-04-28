import { AppProviders } from '@/app/providers/AppProviders';
import { AppStartupGate } from '@/app/layout/AppStartupGate';
import { RootLayout } from '@/app/layout/RootLayout';

export default function App() {
  return (
    <AppProviders>
      <AppStartupGate>
        <RootLayout />
      </AppStartupGate>
    </AppProviders>
  );
}
