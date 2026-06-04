import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Gauge,
  Lightbulb,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerPlotlyFigure } from "@/components/PlotlyChart";
import { ShapSection } from "@/components/ShapSection";
import type { ApplicantForm, PredictResponse } from "@/lib/api";
import { downloadReport } from "@/lib/api";

interface PredictionDashboardProps {
  result: PredictResponse;
  form: ApplicantForm;
}

export function PredictionDashboard({ result, form }: PredictionDashboardProps) {
  const { prediction_details: prediction, assessment, engineered_features, charts } = result;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const blob = await downloadReport(form);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "loan_risk_report.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        className={
          prediction.is_safe
            ? "border-emerald-400/30 bg-gradient-to-br from-emerald-950/40 to-slate-900/40"
            : "border-rose-400/30 bg-gradient-to-br from-rose-950/40 to-slate-900/40"
        }
      >
        <CardContent className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            {prediction.is_safe ? (
              <CheckCircle2 className="h-14 w-14 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-14 w-14 text-rose-400" />
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Model decision (threshold {prediction.threshold.toFixed(2)})
              </p>
              <h2 className="mt-2 text-3xl font-bold text-white">{result.prediction}</h2>
              <p className="mt-2 text-slate-300">
                Probability:{" "}
                <span className="font-semibold text-white">{result.probability.toFixed(4)}</span>
                {" · "}
                Confidence:{" "}
                <span className="font-semibold text-white">{result.confidence.toFixed(2)}%</span>
              </p>
              <p className="mt-2 text-xs text-slate-500">{prediction.decision_rule}</p>
              <p className="mt-1 text-xs text-slate-500">
                P(safe) {(prediction.prob_safe * 100).toFixed(1)}% · P(risk){" "}
                {(prediction.prob_risk * 100).toFixed(1)}% · Class{" "}
                {prediction.predicted_class}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <Stat label="P(Safe)" value={`${(prediction.prob_safe * 100).toFixed(1)}%`} />
            <Stat label="P(Risk)" value={`${(prediction.prob_risk * 100).toFixed(1)}%`} />
            <Stat label="Category" value={prediction.risk_category} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-sky-400" />
              Risk Probability Gauge
            </CardTitle>
            <CardDescription>
              Plotly gauge from model predict_proba — bands derived from bundle threshold
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServerPlotlyFigure figure={charts.gauge} fallbackHeight={280} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-400" />
              Risk Assessment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="leading-relaxed text-slate-300">{assessment.summary}</p>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Key Drivers (from SHAP rankings)
              </p>
              <div className="flex flex-wrap gap-2">
                {assessment.key_drivers.map((driver) => (
                  <span
                    key={driver}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                  >
                    {driver}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FactorList
                title="Top Risk Factors"
                icon={<TrendingDown className="h-4 w-4 text-rose-400" />}
                items={assessment.top_risk_factors}
              />
              <FactorList
                title="Top Positive Factors"
                icon={<TrendingUp className="h-4 w-4 text-emerald-400" />}
                items={assessment.top_positive_factors}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engineered Features</CardTitle>
          <CardDescription>Computed server-side before inference</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <EngineeredStat
            label="Loan-to-Income Ratio"
            value={engineered_features.loan_income_ratio.toFixed(4)}
          />
          <EngineeredStat
            label="Credit History Risk"
            value={engineered_features.credit_history_risk.toFixed(2)}
          />
          <EngineeredStat label="Debt Load" value={engineered_features.debt_load.toFixed(2)} />
        </CardContent>
      </Card>

      <ShapSection result={result} />

      <Card className="border-sky-400/20">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
          <FileText className="h-12 w-12 text-sky-400" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Download PDF Report</h3>
            <p className="text-sm text-slate-400">
              ReportLab export using the same prediction and SHAP outputs.
            </p>
            {downloadError ? (
              <p className="mt-2 text-sm text-rose-400">{downloadError}</p>
            ) : null}
          </div>
          <Button size="lg" onClick={handleDownload} disabled={downloading}>
            <Download className="h-4 w-4" />
            {downloading ? "Generating…" : "Download PDF Report"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}

function EngineeredStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg text-sky-300">{value}</p>
    </div>
  );
}

function FactorList({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </p>
      <ul className="space-y-1 text-sm text-slate-400">
        {items.length ? (
          items.map((item, i) => (
            <li key={item}>
              {i + 1}. {item}
            </li>
          ))
        ) : (
          <li className="text-slate-500">No significant contributors</li>
        )}
      </ul>
    </div>
  );
}
