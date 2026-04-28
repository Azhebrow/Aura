import {
  createContext,
  useCallback,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

const SettingsTabActionsContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);

/**
 * Правая колонка настроек: вкладки с действием вызывают `setTabActions(<Button/>)` в `useLayoutEffect`
 * и сбрасывают слот в cleanup — так кнопка оказывается в одной шапке с заголовком без второй «карточной» шапки.
 */
export function SettingsTabActionsProvider({
  children,
}: {
  children: (rightSlot: ReactNode) => ReactNode;
}) {
  const [slot, setSlot] = useState<ReactNode>(null);

  const setTabActions = useCallback<Dispatch<SetStateAction<ReactNode>>>((value) => {
    setSlot(value);
  }, []);

  return (
    <SettingsTabActionsContext.Provider value={setTabActions}>
      {children(slot)}
    </SettingsTabActionsContext.Provider>
  );
}

export function useSettingsTabActions(): Dispatch<SetStateAction<ReactNode>> {
  const v = useContext(SettingsTabActionsContext);
  if (!v) {
    throw new Error('useSettingsTabActions must be used within SettingsTabActionsProvider');
  }
  return v;
}
