import { useEffect, useState } from 'react';
import { AURA_THEME_CHANGED_EVENT } from '@/features/theme/apply-theme-dom';

export function useThemeRuntimeVersion(): number {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((current) => current + 1);
    window.addEventListener(AURA_THEME_CHANGED_EVENT, bump);
    return () => window.removeEventListener(AURA_THEME_CHANGED_EVENT, bump);
  }, []);

  return version;
}
