let echartsCorePromise: Promise<typeof import('echarts/core')> | null = null;
let registered = false;

export async function loadEChartsCore() {
  if (!echartsCorePromise) {
    echartsCorePromise = Promise.all([
      import('echarts/core'),
      import('echarts/charts'),
      import('echarts/components'),
      import('echarts/renderers'),
    ]).then(([core, charts, components, renderers]) => {
      if (!registered) {
        core.use([
          charts.BarChart,
          charts.LineChart,
          charts.ScatterChart,
          charts.PieChart,
          charts.HeatmapChart,
          components.GridComponent,
          components.TooltipComponent,
          components.LegendComponent,
          components.GraphicComponent,
          components.DataZoomComponent,
          components.VisualMapComponent,
          components.AxisPointerComponent,
          renderers.CanvasRenderer,
        ]);
        registered = true;
      }
      return core;
    });
  }
  return echartsCorePromise;
}
