import type { EChartsOption } from 'echarts';
import { formatTimeFromHours } from '@/features/stats/stats-table-format';
import {
  escapeHtml,
  getChartDisplayValue,
  getChartIconUrl,
  getChartNumericValue,
  getNutritionNumericValue,
  resolveChartColor,
} from './stats-chart-utils';
import type {
  StatsChartPanelSpec,
  StatsChartScreenSpec,
  StatsCorrelationOverviewPanelSpec,
  StatsCorrelationTrendPanelSpec,
  StatsDonutPanelSpec,
  StatsHeatmapPanelSpec,
  StatsSeriesPanelSpec,
  StatsTickFormat,
} from './stats-chart-semantics';

export type ThemeColors = {
  background: string;
  card: string;
  popover: string;
  foreground: string;
  mutedForeground: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  grid: string;
  splitLine: string;
  axisLine: string;
  tooltipBg: string;
  tooltipText: string;
  fontFamily: string;
};

function cssColorToRgba(cssColor: string, alpha: number): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return `rgba(128,128,128,${alpha})`;
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r},${g},${b},${alpha})`;
  } catch {
    return `rgba(128,128,128,${alpha})`;
  }
}

export function readThemeColors(): ThemeColors {
  if (typeof document === 'undefined') {
    return {
      background: '#0f172a',
      card: '#111827',
      popover: '#111827',
      foreground: '#f8fafc',
      mutedForeground: '#94a3b8',
      border: '#334155',
      primary: '#60a5fa',
      secondary: '#94a3b8',
      accent: '#1f2937',
      muted: '#1f2937',
      grid: '#334155',
      splitLine: 'rgba(148, 163, 184, 0.035)',
      axisLine: 'rgba(51, 65, 85, 0.14)',
      tooltipBg: '#0f172a',
      tooltipText: '#f8fafc',
      fontFamily: 'inherit',
    };
  }

  const style = getComputedStyle(document.documentElement);
  const bodyStyle = getComputedStyle(document.body);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const popover = get('--popover', get('--card', '#111827'));
  const border = get('--border', '#334155');
  const foreground = get('--foreground', '#f8fafc');
  return {
    background: get('--background', '#0f172a'),
    card: get('--card', '#111827'),
    popover,
    foreground,
    mutedForeground: get('--muted-foreground', '#94a3b8'),
    border,
    primary: get('--primary', '#60a5fa'),
    secondary: get('--secondary', '#94a3b8'),
    accent: get('--accent', '#1f2937'),
    muted: get('--muted', '#1f2937'),
    grid: get('--border', '#334155'),
    splitLine: cssColorToRgba(foreground, 0.04),
    axisLine: cssColorToRgba(foreground, 0.14),
    tooltipBg: `color-mix(in srgb, ${popover} 94%, transparent)`,
    tooltipText: foreground,
    fontFamily: bodyStyle.fontFamily || style.fontFamily || 'inherit',
  };
}

function buildTooltipIconHtml(iconUrl: string | null, color: string): string {
  if (iconUrl) {
    return `
      <span
        aria-hidden="true"
        style="
          display:inline-block;
          width:14px;
          height:14px;
          flex:0 0 auto;
          vertical-align:-2px;
          background-color:${escapeHtml(color)};
          -webkit-mask:url('${escapeHtml(iconUrl)}') center / contain no-repeat;
          mask:url('${escapeHtml(iconUrl)}') center / contain no-repeat;
        "
      ></span>
    `;
  }

  return `<span aria-hidden="true" style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${escapeHtml(color)};margin-right:8px;vertical-align:1px;"></span>`;
}

function formatTickValue(value: number, format: StatsTickFormat): string {
  switch (format) {
    case 'percent':
      return `${Math.round(value)}%`;
    case 'duration':
      return formatTimeFromHours(value);
    case 'currency':
      return Math.round(value).toLocaleString('ru-RU');
    case 'integer':
      return Math.round(value).toLocaleString('ru-RU');
    case 'plain':
    default:
      return Number(value).toLocaleString('ru-RU');
  }
}

function formatCompactValueLabel(value: number | null | undefined, format: StatsTickFormat): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return formatTickValue(Number(value), format);
}

function formatSeriesLabelValue(
  value: number | null | undefined,
  format: StatsTickFormat,
  options?: { wholeHoursOnly?: boolean }
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const numeric = Number(value);
  if (Math.abs(numeric) < 0.0001) return '';
  if (format === 'duration' && options?.wholeHoursOnly) {
    const roundedHours = Math.round(numeric);
    return roundedHours === 0 ? '' : `${roundedHours} ч`;
  }
  return formatCompactValueLabel(numeric, format);
}

function getPanelNumericValue(panel: StatsSeriesPanelSpec, key: string, raw: unknown): number | null {
  if (panel.mode === 'nutrition') return getNutritionNumericValue(key, raw as never);
  return getChartNumericValue(panel.mode, key, raw as never);
}

function buildSeriesTooltip(panel: StatsSeriesPanelSpec, theme: ThemeColors, params: unknown): string {
  const items = Array.isArray(params) ? (params as Array<{ seriesName?: string; dataIndex?: number; color?: string }>) : [];
  const row = items[0]?.dataIndex != null ? panel.table.rows[items[0].dataIndex] : null;
  if (!row) return '';

  const visibleKeys = panel.keys.filter((key) => {
    const numeric = getPanelNumericValue(panel, key, row.originalValues[key]);
    return numeric !== null && Math.abs(numeric) > 0.0001;
  });

  const lines = visibleKeys
    .map((key) => {
      const entry = items.find((item) => item.seriesName === key);
      const color = resolveChartColor(panel.meta.colors[key] ?? entry?.color ?? null, '#60a5fa');
      const iconUrl = getChartIconUrl(panel.meta.icons[key]);
      return `
        <div style="display:flex;align-items:flex-start;gap:8px;justify-content:space-between;">
          <div style="display:flex;align-items:center;min-width:0;gap:6px;">
            ${buildTooltipIconHtml(iconUrl, color)}
            <span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(key)}</span>
          </div>
          <strong style="margin-left:12px;font-variant-numeric:tabular-nums;white-space:nowrap;">${escapeHtml(getChartDisplayValue(row, key))}</strong>
        </div>
      `;
    })
    .join('');

  return `
    <div style="min-width:220px;max-width:360px;color:${escapeHtml(theme.tooltipText)};font-family:${escapeHtml(theme.fontFamily)};">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:inherit;">${escapeHtml(row.label)}</div>
      <div style="display:flex;flex-direction:column;gap:6px;">${lines || '<div style="font-size:12px;opacity:.68;">Нет значений</div>'}</div>
    </div>
  `;
}

function buildHeatmapTooltip(panel: StatsHeatmapPanelSpec, theme: ThemeColors, params: unknown): string {
  const item = params as { data?: [number, number, number] };
  const data = item?.data;
  if (!data) return '';
  const [xIndex, yIndex, normalized] = data;
  const row = panel.table.rows[xIndex];
  const key = panel.keys[yIndex];
  if (!row || !key) return '';
  const color = resolveChartColor(panel.meta.colors[key], '#60a5fa');
  const iconUrl = getChartIconUrl(panel.meta.icons[key]);

  return `
    <div style="min-width:220px;max-width:360px;color:${escapeHtml(theme.tooltipText)};font-family:${escapeHtml(theme.fontFamily)};">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:inherit;">${escapeHtml(row.label)}</div>
      <div style="font-size:12px;color:inherit;opacity:.8;margin-bottom:8px;">${escapeHtml(key)}</div>
      <div style="display:flex;align-items:center;gap:8px;color:inherit;">
        ${buildTooltipIconHtml(iconUrl, color)}
        <strong style="font-variant-numeric:tabular-nums;color:inherit;">${escapeHtml(getChartDisplayValue(row, key))}</strong>
        <span style="opacity:.65;color:inherit;">(${Math.round(normalized)}%)</span>
      </div>
    </div>
  `;
}

function buildDonutTooltip(panel: StatsDonutPanelSpec, theme: ThemeColors, params: unknown): string {
  const item = params as { name?: string; percent?: number };
  const found = panel.slices.find((slice) => slice.label === item.name);
  if (!found) return '';
  return `
    <div style="min-width:220px;max-width:340px;color:${escapeHtml(theme.tooltipText)};font-family:${escapeHtml(theme.fontFamily)};">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:inherit;">${escapeHtml(found.label)}</div>
      <div style="display:flex;align-items:center;gap:8px;color:inherit;">
        ${buildTooltipIconHtml(found.icon, found.color)}
        <strong style="font-variant-numeric:tabular-nums;color:inherit;">${escapeHtml(found.displayValue)}</strong>
        <span style="opacity:.65;color:inherit;">${Math.round(Number(item.percent) || 0)}%</span>
      </div>
      ${found.detailText ? `<div style="margin-top:6px;font-size:11px;opacity:.75;color:inherit;">${escapeHtml(found.detailText)}</div>` : ''}
    </div>
  `;
}

function buildCorrelationOverviewTooltip(panel: StatsCorrelationOverviewPanelSpec, theme: ThemeColors, params: unknown): string {
  const item = Array.isArray(params) ? (params[0] as { name?: string }) : null;
  const found = panel.rows.find((row) => row.key === item?.name);
  if (!found) return '';
  return `
    <div style="min-width:220px;max-width:340px;color:${escapeHtml(theme.tooltipText)};font-family:${escapeHtml(theme.fontFamily)};">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:inherit;">${escapeHtml(found.label)}</div>
      <div style="display:flex;align-items:center;gap:8px;color:inherit;">
        ${buildTooltipIconHtml(found.icon, found.color)}
        <strong style="font-variant-numeric:tabular-nums;color:inherit;">${escapeHtml(found.displayValue)}</strong>
      </div>
    </div>
  `;
}

function buildCorrelationTrendTooltip(panel: StatsCorrelationTrendPanelSpec, theme: ThemeColors, params: unknown): string {
  const items = Array.isArray(params) ? (params as Array<{ axisValue?: string; value?: number }>) : [];
  const first = items[0];
  if (!first) return '';
  return `
    <div style="min-width:220px;max-width:320px;color:${escapeHtml(theme.tooltipText)};font-family:${escapeHtml(theme.fontFamily)};">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:inherit;">${escapeHtml(String(first.axisValue ?? ''))}</div>
      <div style="font-variant-numeric:tabular-nums;color:inherit;">${escapeHtml(`${Number(first.value ?? 0).toFixed(1)}%`)}</div>
    </div>
  `;
}

export function buildPanelOption(screen: StatsChartScreenSpec, panel: StatsChartPanelSpec, theme: ThemeColors): EChartsOption {
  if (panel.kind === 'series') {
    const hasManyPoints = panel.table.rows.length > 24;
    const showLinePointLabels = panel.variant === 'line';
    const showLineSymbols = panel.variant === 'line';
    const canShowStackTotals =
      panel.variant === 'bar' &&
      panel.stacked &&
      panel.series.every((series) => series.data.every((value) => value === null || value >= 0));
    const stackTotals = canShowStackTotals
      ? panel.xLabels.map((_, dataIndex) => panel.series.reduce((sum, series) => sum + (series.data[dataIndex] ?? 0), 0))
      : null;
    return {
      backgroundColor: 'transparent',
      textStyle: { color: theme.foreground, fontFamily: theme.fontFamily },
      animationDuration: 280,
      animationDurationUpdate: 240,
      grid: {
        left: 12,
        right: 16,
        top: showLinePointLabels || canShowStackTotals ? 26 : 12,
        bottom: hasManyPoints ? 46 : 30,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        renderMode: 'html',
        confine: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.border,
        borderWidth: 1,
        textStyle: { color: theme.tooltipText, fontFamily: theme.fontFamily },
        extraCssText: 'box-shadow: 0 16px 40px rgba(0,0,0,.18); border-radius: 12px;',
        formatter: (params: unknown) => buildSeriesTooltip(panel, theme, params),
      },
      xAxis: {
        type: 'category',
        data: panel.xLabels,
        axisLabel: {
          color: theme.mutedForeground,
          rotate: hasManyPoints ? 28 : 0,
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { lineStyle: { color: theme.axisLine } },
      },
      yAxis: {
        type: 'value',
        name: panel.yAxisName,
        nameTextStyle: { color: theme.mutedForeground },
        max: (value: { max: number }) => {
          if (!(value.max > 0)) return value.max;
          return showLinePointLabels || canShowStackTotals ? value.max * 1.14 : value.max;
        },
        min: (value: { min: number }) => {
          if (!(value.min < 0)) return Math.min(0, value.min);
          return value.min * 1.1;
        },
        axisLabel: {
          color: theme.mutedForeground,
          formatter: (value: number) => formatTickValue(value, panel.tickFormat),
        },
        splitLine: {
          lineStyle: { color: theme.splitLine },
        },
      },
      dataZoom: hasManyPoints
        ? [
            {
              type: 'inside',
              xAxisIndex: 0,
              filterMode: 'none',
            },
            {
              type: 'slider',
              xAxisIndex: 0,
              height: 16,
              bottom: 8,
              borderColor: theme.border,
              backgroundColor: theme.muted,
              fillerColor: theme.secondary,
              dataBackground: {
                lineStyle: { color: theme.secondary },
                areaStyle: { color: theme.muted },
              },
              handleStyle: { color: theme.primary, borderColor: theme.primary },
              moveHandleStyle: { color: theme.primary },
            },
          ]
        : [],
      series: panel.series.map((series) => ({
        name: series.label,
        type: panel.variant,
        stack: panel.stacked ? 'total' : undefined,
        smooth: panel.variant === 'line',
        showSymbol: showLineSymbols,
        symbolSize: panel.mode === 'mood' ? 10 : 7.5,
        emphasis: { focus: 'none', scale: false },
        blur: screen.interactionPolicy.disableBlur ? { itemStyle: { opacity: 1 }, lineStyle: { opacity: 1 }, areaStyle: { opacity: 1 } } : undefined,
        legendHoverLink: !screen.interactionPolicy.disableLegendHoverLink,
        barMaxWidth: 26,
        itemStyle: { color: series.color, opacity: 0.96 },
        lineStyle: { width: 2.6, color: series.color },
        areaStyle: panel.variant === 'line' ? { opacity: panel.mode === 'rank' ? 0.12 : 0.16 } : undefined,
        label:
          panel.variant === 'line'
            ? {
                show: showLinePointLabels,
                position: 'top',
                distance: 8,
                color: theme.foreground,
                fontSize: 10,
                fontWeight: 600,
                fontFamily: theme.fontFamily,
                formatter: (params: { value?: number | null }) => formatSeriesLabelValue(params.value, panel.tickFormat),
              }
            : canShowStackTotals && stackTotals
              ? {
                  show: series.id === panel.series[panel.series.length - 1]?.id,
                  position: 'top',
                  distance: 6,
                  color: theme.foreground,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: theme.fontFamily,
                  formatter: (params: { dataIndex?: number }) => {
                    const total = params.dataIndex != null ? stackTotals[params.dataIndex] : null;
                    return formatSeriesLabelValue(total, panel.tickFormat, { wholeHoursOnly: panel.tickFormat === 'duration' });
                  },
                }
              : {
                  show: true,
                  position: 'top',
                  distance: 6,
                  color: theme.foreground,
                  fontSize: 10,
                  fontWeight: 700,
                  fontFamily: theme.fontFamily,
                  formatter: (params: { value?: number | null }) => formatSeriesLabelValue(params.value, panel.tickFormat),
                },
        labelLayout: { hideOverlap: true },
        data: series.data,
      })),
    };
  }

  if (panel.kind === 'heatmap') {
    return {
      backgroundColor: 'transparent',
      textStyle: { color: theme.foreground, fontFamily: theme.fontFamily },
      animationDuration: 250,
      grid: {
        left: 78,
        right: 18,
        top: 54,
        bottom: 28,
        containLabel: true,
      },
      tooltip: {
        position: 'top',
        renderMode: 'html',
        confine: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.border,
        borderWidth: 1,
        textStyle: { color: theme.tooltipText, fontFamily: theme.fontFamily },
        extraCssText: 'box-shadow: 0 16px 40px rgba(0,0,0,.18); border-radius: 12px;',
        formatter: (params: unknown) => buildHeatmapTooltip(panel, theme, params),
      },
      xAxis: {
        type: 'category',
        data: panel.table.rows.map((row) => row.label),
        splitArea: { show: false },
        axisLabel: {
          color: theme.mutedForeground,
          rotate: panel.table.rows.length > 22 ? 28 : 0,
          hideOverlap: true,
        },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { lineStyle: { color: theme.axisLine } },
      },
      yAxis: {
        type: 'category',
        data: panel.keys,
        inverse: true,
        splitArea: { show: true },
        axisLabel: { color: theme.mutedForeground },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { lineStyle: { color: theme.axisLine } },
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        textStyle: { color: theme.mutedForeground },
        itemWidth: 140,
        inRange: {
          color: [theme.muted, theme.secondary, theme.primary],
        },
      },
      series: [
        {
          type: 'heatmap',
          data: panel.normalizedMatrix,
          label: { show: false },
          legendHoverLink: !screen.interactionPolicy.disableLegendHoverLink,
          emphasis: {
            itemStyle: {
              shadowBlur: 12,
              shadowColor: 'rgba(0, 0, 0, 0.25)',
              opacity: 1,
            },
          },
          blur: screen.interactionPolicy.disableBlur ? { itemStyle: { opacity: 1 } } : undefined,
          itemStyle: {
            borderColor: theme.background,
            borderWidth: 1,
          },
        },
      ],
    };
  }

  if (panel.kind === 'donut') {
    return {
      backgroundColor: 'transparent',
      textStyle: { color: theme.foreground, fontFamily: theme.fontFamily },
      tooltip: {
        trigger: 'item',
        renderMode: 'html',
        confine: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.border,
        borderWidth: 1,
        textStyle: { color: theme.tooltipText, fontFamily: theme.fontFamily },
        extraCssText: 'box-shadow: 0 16px 40px rgba(0,0,0,.18); border-radius: 12px;',
        formatter: (params: unknown) => buildDonutTooltip(panel, theme, params),
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { color: theme.mutedForeground },
      },
      series: [
        {
          type: 'pie',
          radius: ['46%', '72%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          selectedMode: screen.interactionPolicy.disablePieSelection ? false : true,
          legendHoverLink: !screen.interactionPolicy.disableLegendHoverLink,
          itemStyle: {
            borderColor: theme.background,
            borderWidth: 2,
          },
          emphasis: {
            scale: false,
            itemStyle: { opacity: 1 },
          },
          blur: screen.interactionPolicy.disableBlur ? { itemStyle: { opacity: 1 } } : undefined,
          label: {
            color: theme.foreground,
            formatter: (params: { name?: string; value?: number }) => {
              const found = panel.slices.find((slice) => slice.label === params.name);
              return `${params.name ?? ''}\n${found?.displayValue ?? formatTimeFromHours(Number(params.value) || 0)}`;
            },
          },
          labelLine: {
            lineStyle: { color: theme.border },
          },
          data: panel.slices.map((slice) => ({
            name: slice.label,
            value: slice.value,
            itemStyle: { color: slice.color },
          })),
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '40%',
          style: {
            text: panel.centerPrimary,
            fill: theme.foreground,
            fontSize: 20,
            fontWeight: 700,
            fontFamily: theme.fontFamily,
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '50%',
          style: {
            text: panel.centerSecondary,
            fill: theme.mutedForeground,
            fontSize: 11,
            fontFamily: theme.fontFamily,
          },
        },
      ],
    };
  }

  if (panel.kind === 'correlation-overview') {
    const maxValue = Math.max(100, ...panel.rows.map((row) => row.value));
    return {
      backgroundColor: 'transparent',
      textStyle: { color: theme.foreground, fontFamily: theme.fontFamily },
      grid: {
        left: 54,
        right: 18,
        top: 18,
        bottom: 20,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        renderMode: 'html',
        confine: true,
        backgroundColor: theme.tooltipBg,
        borderColor: theme.border,
        borderWidth: 1,
        textStyle: { color: theme.tooltipText, fontFamily: theme.fontFamily },
        extraCssText: 'box-shadow: 0 16px 40px rgba(0,0,0,.18); border-radius: 12px;',
        formatter: (params: unknown) => buildCorrelationOverviewTooltip(panel, theme, params),
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.max(100, Math.ceil(maxValue / 10) * 10),
        axisLabel: { color: theme.mutedForeground, formatter: (value: number) => `${Math.round(value)}%` },
        splitLine: { lineStyle: { color: theme.splitLine } },
      },
      yAxis: {
        type: 'category',
        data: panel.rows.map((row) => row.key),
        inverse: true,
        axisLabel: {
          show: false,
        },
        axisLine: { lineStyle: { color: theme.axisLine } },
        axisTick: { lineStyle: { color: theme.axisLine } },
      },
      series: [
        {
          type: 'bar',
          data: panel.rows.map((row) => ({
            value: row.value,
            itemStyle: { color: row.color },
          })),
          barMaxWidth: 22,
          emphasis: { disabled: true },
          blur: screen.interactionPolicy.disableBlur ? { itemStyle: { opacity: 1 } } : undefined,
          legendHoverLink: !screen.interactionPolicy.disableLegendHoverLink,
          itemStyle: {
            borderRadius: [0, 10, 10, 0],
          },
          label: {
            show: true,
            position: 'right',
            distance: 8,
            color: theme.foreground,
            fontSize: 10,
            fontWeight: 700,
            fontFamily: theme.fontFamily,
            formatter: (params: { dataIndex?: number }) => {
              const row = params.dataIndex != null ? panel.rows[params.dataIndex] : null;
              return row?.displayValue ?? '';
            },
          },
        },
      ],
    };
  }

  const trendPanel = panel as StatsCorrelationTrendPanelSpec;
  const maxValue = Math.max(100, ...trendPanel.values);
  return {
    backgroundColor: 'transparent',
    textStyle: { color: theme.foreground, fontFamily: theme.fontFamily },
    grid: {
      left: 12,
      right: 16,
      top: 16,
      bottom: 28,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      renderMode: 'html',
      confine: true,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.border,
      borderWidth: 1,
      textStyle: { color: theme.tooltipText, fontFamily: theme.fontFamily },
      extraCssText: 'box-shadow: 0 16px 40px rgba(0,0,0,.18); border-radius: 12px;',
      formatter: (params: unknown) => buildCorrelationTrendTooltip(trendPanel, theme, params),
    },
    xAxis: {
      type: 'category',
      data: trendPanel.xLabels,
      axisLabel: {
        color: theme.mutedForeground,
        rotate: trendPanel.xLabels.length > 22 ? 28 : 0,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { lineStyle: { color: theme.border } },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: Math.max(100, Math.ceil(maxValue / 10) * 10),
      axisLabel: { color: theme.mutedForeground, formatter: (value: number) => `${Math.round(value)}%` },
      splitLine: { lineStyle: { color: theme.splitLine } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbolSize: 7.5,
        emphasis: { disabled: true },
        blur: screen.interactionPolicy.disableBlur ? { lineStyle: { opacity: 1 }, areaStyle: { opacity: 1 }, itemStyle: { opacity: 1 } } : undefined,
        legendHoverLink: !screen.interactionPolicy.disableLegendHoverLink,
        lineStyle: { width: 2.6, color: theme.primary },
        areaStyle: { opacity: 0.16, color: theme.primary },
        itemStyle: { color: theme.primary },
        label: {
          show: true,
          position: 'top',
          distance: 8,
          color: theme.foreground,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: theme.fontFamily,
          formatter: (params: { value?: number | null }) => {
            const value = params.value;
            return value == null || !Number.isFinite(Number(value)) || Math.abs(Number(value)) < 0.0001 ? '' : `${Number(value).toFixed(1)}%`;
          },
        },
        labelLayout: { hideOverlap: true },
        data: trendPanel.values,
      },
    ],
  };
}
