import { useEffect, useState } from 'react';
import { Pipette } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CFG_COLOR_PRESETS, type CfgColorPreset, normalizeHexColor } from '@/features/settings/cfg-color-presets';
import { cn } from '@/lib/utils';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** При клике по пресету: если true — сразу вызывается `onPresetPick` и можно закрыть панель. */
  onPresetPick?: (value: string) => void;
  presets?: CfgColorPreset[];
  allowCustom?: boolean;
};

export function ColorPickerPanel({ value, onChange, onPresetPick, presets, allowCustom = true }: Props) {
  const [draft, setDraft] = useState(() => normalizeHexColor(value));
  const palette = presets ?? CFG_COLOR_PRESETS.map((p) => ({ label: p.label, value: p.hex }));

  useEffect(() => {
    setDraft(value || '#64748b');
  }, [value]);

  const applyDraft = (next: string) => {
    setDraft(next);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label className="text-muted-foreground mb-2 block text-xs font-semibold uppercase tracking-wider">
          Пресеты
        </Label>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {palette.map((p) => (
            <button
              key={p.value}
              type="button"
              title={p.label}
              className={cn(
                'group flex flex-col items-center gap-1 rounded-lg border border-border/60 p-1.5 text-center',
                'motion-safe:transition-[transform,box-shadow] motion-safe:duration-aura-fast motion-safe:ease-aura',
                'hover:border-primary/40 hover:shadow-sm active:scale-[0.97]',
                draft.toLowerCase() === p.value.toLowerCase() && 'border-primary ring-primary/25 ring-2'
              )}
              onClick={() => {
                applyDraft(p.value);
                onPresetPick?.(p.value);
              }}
            >
              <span
                className="size-8 rounded-md border border-foreground/12 shadow-inner ring-1 ring-foreground/8"
                style={{ backgroundColor: p.value }}
              />
              <span className="text-muted-foreground line-clamp-2 w-full text-xs font-medium leading-tight">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {allowCustom ? (
        <div className="border-border/60 bg-muted/20 flex flex-col gap-3 rounded-xl border p-3">
          <div className="flex items-center gap-2">
            <Pipette className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className="text-xs font-semibold">Свой цвет</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="color"
              aria-label="Выбор цвета"
              className="border-input h-11 w-14 shrink-0 cursor-pointer rounded-lg border bg-background p-1 shadow-xs"
              value={normalizeHexColor(draft)}
              onChange={(e) => applyDraft(e.target.value)}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Label htmlFor="cfg-color-hex" className="text-xs font-medium">
                HEX
              </Label>
              <Input
                id="cfg-color-hex"
                className="font-mono text-xs"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => applyDraft(normalizeHexColor(draft))}
                placeholder="#6366f1"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
