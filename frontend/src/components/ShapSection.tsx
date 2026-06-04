import type { ReactNode } from "react";
import { BarChart3, Minus, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerPlotlyFigure } from "@/components/PlotlyChart";
import type { PredictResponse, ShapContribution } from "@/lib/api";

interface ShapSectionProps {
  result: PredictResponse;
}

export function ShapSection({ result }: ShapSectionProps) {
  const { shap, charts } = result;

  return (
    <Card className="border-indigo-400/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-400" />
          Why did the model make this prediction?
        </CardTitle>
        <CardDescription>
          shap.TreeExplainer → native waterfall plot + Plotly waterfall from the same SHAP values
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {charts.shap_waterfall_png ? (
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              SHAP Waterfall (shap.plots.waterfall)
            </p>
            <img
              src={`data:image/png;base64,${charts.shap_waterfall_png}`}
              alt="SHAP waterfall explanation from TreeExplainer"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50"
            />
          </div>
        ) : null}

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            SHAP Impact Waterfall (Plotly, server-generated)
          </p>
          <ServerPlotlyFigure figure={charts.waterfall} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ContributorTable
            title="Top Positive Contributors"
            icon={<Plus className="h-4 w-4 text-emerald-400" />}
            items={shap.positive.slice(0, 8)}
            positive
          />
          <ContributorTable
            title="Top Negative Contributors"
            icon={<Minus className="h-4 w-4 text-rose-400" />}
            items={shap.negative.slice(0, 8)}
            positive={false}
          />
        </div>

        <p className="text-center text-xs text-slate-500">
          Base value (expected): {shap.expected_value.toFixed(4)}
        </p>
      </CardContent>
    </Card>
  );
}

function ContributorTable({
  title,
  icon,
  items,
  positive,
}: {
  title: string;
  icon: ReactNode;
  items: ShapContribution[];
  positive: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
      <p className="mb-4 flex items-center gap-2 font-semibold text-white">
        {icon}
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No contributors in this category</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs text-slate-500">
              <th className="pb-2">Feature</th>
              <th className="pb-2 text-right">SHAP impact</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.feature} className="border-b border-white/5">
                <td className="py-2 text-slate-300">{item.label}</td>
                <td
                  className={`py-2 text-right font-mono ${
                    positive ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {item.impact > 0 ? "+" : ""}
                  {item.impact.toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
