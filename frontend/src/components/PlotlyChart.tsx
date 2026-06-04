import type { Data, Layout } from "plotly.js";
import { Component, lazy, Suspense, type ReactNode } from "react";

const Plot = lazy(() => import("react-plotly.js"));

export interface PlotlyFigureJson {
  data?: Data[];
  layout?: Partial<Layout>;
}

interface ServerPlotlyFigureProps {
  figure: PlotlyFigureJson;
  fallbackHeight?: number;
}

interface BoundaryState {
  hasError: boolean;
  message?: string;
}

class PlotErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/** Renders Plotly JSON produced by the Flask API — no client-side chart fabrication. */
export function ServerPlotlyFigure({ figure, fallbackHeight = 360 }: ServerPlotlyFigureProps) {
  const data = figure?.data ?? [];
  const layout = figure?.layout ?? {};
  const height = typeof layout.height === "number" ? layout.height : fallbackHeight;

  if (!data.length) {
    return <p className="text-sm text-slate-500">No chart data from model pipeline.</p>;
  }

  return (
    <PlotErrorBoundary
      fallback={
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          Plotly chart failed to render. SHAP tables and native waterfall image are still valid.
        </p>
      }
    >
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center text-sm text-slate-400"
            style={{ height }}
          >
            Loading model chart…
          </div>
        }
      >
        <Plot
          data={data}
          layout={{ ...layout, autosize: true }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height }}
          useResizeHandler
        />
      </Suspense>
    </PlotErrorBoundary>
  );
}
