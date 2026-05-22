import { useEffect, useState } from 'react';
import { Copy, Pipette, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CFG_COLOR_PRESETS, type CfgColorPreset, normalizeHexColor } from '@/features/settings/cfg-color-presets';
import { cn } from '@/lib/utils';

const COLOR_PICKER_DEFAULT = '#64748b';

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
    setDraft(value || COLOR_PICKER_DEFAULT);
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
    <div className="flex flex-col gap-5">
      {/* Пресеты */}
      <div>
        <Label className="text-muted-foreground mb-3 block text-xs font-semibold uppercase tracking-wider">
          Популярные цвета
        </Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {palette.map((p) => (
            <button
              key={p.value}
              type="button"
              title={p.label}
              className={cn(
                'group relative flex flex-col items-center gap-2 rounded-xl p-2',
                'motion-safe:transition-all motion-safe:duration-aura-fast motion-safe:ease-aura',
                'hover:scale-105 active:scale-[0.95]',
                isSelected(p.value) ? 'ring-2 ring-primary ring-offset-2' : 'hover:shadow-md'
              )}
              onClick={() => {
                applyDraft(p.value);
                onPresetPick?.(p.value);
              }}
            >
              <div
                className={cn(
                  'h-12 w-full rounded-lg border shadow-sm',
                  isSelected(p.value)
                    ? 'border-primary/60 shadow-md'
                    : 'border-border/40 hover:border-border/60'
                )}
                style={{ backgroundColor: p.value }}
              />
              <span className={cn(
                'text-xs font-medium leading-tight text-center line-clamp-2 w-full',
                isSelected(p.value) ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
              )}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {allowCustom ? (
        <div className="space-y-4">
          {/* Превью текущего цвета */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
            <div
              className="h-16 w-16 shrink-0 rounded-lg border border-border/60 shadow-sm"
              style={{ backgroundColor: draft }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">Текущий цвет</p>
              <p className="text-sm font-semibold truncate">{draft.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground mt-1">Нажмите на цвет в сетке для быстрого выбора</p>
            </div>
          </div>

          {/* Выбор цвета */}
          <div className="border-border/60 bg-muted/20 rounded-xl border p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Pipette className="text-muted-foreground size-4 shrink-0" />
              <span className="text-xs font-semibold">Свой цвет</span>
            </div>

            {/* Color picker и HEX */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="color"
                aria-label="Выбор цвета"
                className="border-input h-12 w-full sm:w-24 shrink-0 cursor-pointer rounded-lg border bg-background p-1 shadow-xs"
                value={normalizeHexColor(draft)}
                onChange={(e) => applyDraft(e.target.value)}
              />
              <div className="flex-1 flex flex-col gap-2">
                <Label htmlFor="cfg-color-hex" className="text-xs font-medium">
                  HEX код
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cfg-color-hex"
                    className="text-sm"
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
                    className="shrink-0"
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
