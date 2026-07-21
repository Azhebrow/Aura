import { useEffect, useState } from 'react';
import { Copy, Pipette, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CFG_COLOR_PRESETS, type CfgColorPreset, normalizeHexColor } from '@/features/settings/cfg-color-presets';
import { cn } from '@/lib/utils';
import { DEFAULT_PICKER_COLOR } from '@/shared/config/aura-palette';

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
  const [copied, setCopied] = useState(false);
  const palette = presets ?? CFG_COLOR_PRESETS.map((p) => ({ label: p.label, value: p.hex }));
  const isSelected = (color: string) => draft.toLowerCase() === color.toLowerCase();

  useEffect(() => {
    setDraft(value || DEFAULT_PICKER_COLOR);
  }, [value]);

  const applyDraft = (next: string) => {
    setDraft(next);
    onChange(next);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Пресеты */}
      <div>
        <Label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-dim">
          Популярные цвета
        </Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {palette.map((p) => {
            const selected = isSelected(p.value);

            return (
              <button
                key={p.value}
                type="button"
                title={`${p.label} ${p.value.toUpperCase()}`}
                className={cn(
                  'aura-operator-row group relative flex min-w-0 flex-col gap-1.5 rounded-lg border p-1.5 text-left outline-none aura-tx-surface',
                  'focus-visible:ring-2 focus-visible:ring-ring/50',
                  selected
                    ? 'border-primary/45 bg-active'
                    : 'border-soft bg-control/35 hover:bg-hover hover:border-strong/70'
                )}
                onClick={() => {
                  applyDraft(p.value);
                  onPresetPick?.(p.value);
                }}
              >
                <span
                  className="aura-operator-swatch relative h-9 w-full overflow-hidden rounded-md border border-soft/70"
                  style={{ backgroundColor: p.value }}
                  aria-hidden
                >
                  {selected ? (
                    <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-sm bg-background/90 text-foreground shadow-xs">
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 truncate text-xs font-semibold leading-tight text-foreground">
                  {p.label}
                </span>
                <span className="min-w-0 truncate text-[10px] font-medium uppercase leading-none text-faint tabular-nums">
                  {p.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {allowCustom ? (
        <div className="space-y-3">
          {/* Превью текущего цвета */}
          <div className="aura-operator-row flex items-center gap-3 rounded-lg border border-soft bg-control/35 p-3 aura-tx-surface">
            <div
              className="aura-operator-swatch size-12 shrink-0 rounded-md border border-soft"
              style={{ backgroundColor: draft }}
            />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs font-medium text-dim">Текущий цвет</p>
              <p className="truncate text-sm font-semibold uppercase tabular-nums text-foreground">{draft}</p>
            </div>
          </div>

          {/* Выбор цвета */}
          <div className="aura-operator-row space-y-3 rounded-lg border border-soft bg-control/35 p-3 aura-tx-surface">
            <div className="flex items-center gap-2">
              <Pipette className="size-4 shrink-0 text-dim" />
              <span className="text-xs font-semibold uppercase tracking-wider text-dim">Свой цвет</span>
            </div>

            {/* Color picker и HEX */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="color"
                aria-label="Выбор цвета"
                className="aura-operator-swatch h-10 w-full shrink-0 cursor-pointer rounded-lg border border-soft bg-background p-1 shadow-none sm:w-24"
                value={normalizeHexColor(draft)}
                onChange={(e) => applyDraft(e.target.value)}
              />
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor="cfg-color-hex" className="text-xs font-medium text-dim">
                  HEX код
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cfg-color-hex"
                    className="h-10 rounded-lg border-soft bg-background/55 text-sm uppercase tabular-nums shadow-none"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => applyDraft(normalizeHexColor(draft))}
                    placeholder="#6366f1"
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                    className="h-10 shrink-0 rounded-lg border-soft bg-control shadow-none hover:bg-hover"
                    title="Копировать в буфер"
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
