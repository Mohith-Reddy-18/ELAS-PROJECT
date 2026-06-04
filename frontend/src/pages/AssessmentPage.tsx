import { AlertCircle, ClipboardList, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LoanForm } from "@/components/LoanForm";
import { PredictionDashboard } from "@/components/PredictionDashboard";
import { Card, CardContent } from "@/components/ui/card";
import {
  checkHealth,
  fetchFormOptions,
  predictRisk,
  type ApplicantForm,
  type FormOptions,
  type PredictResponse,
} from "@/lib/api";

export function AssessmentPage() {
  const [formOptions, setFormOptions] = useState<FormOptions | null>(null);
  const [form, setForm] = useState<ApplicantForm | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setOptionsLoading(true);
      setError(null);
      try {
        const [ready, opts] = await Promise.all([checkHealth(), fetchFormOptions()]);
        if (cancelled) return;
        setModelReady(ready);
        setFormOptions(opts);
        setForm(opts.defaults);
      } catch (err) {
        if (cancelled) return;
        setModelReady(false);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load form options. Is Flask running on port 5000?",
        );
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (result && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handlePredict = async () => {
    if (!form) return;
    setLoading(true);
    setError(null);
    try {
      const response = await predictRisk(form);
      setResult(response);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  if (optionsLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
        <p className="text-sm text-slate-400">Loading form options…</p>
      </div>
    );
  }

  if (!formOptions || !form) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
        <h2 className="mt-4 text-xl font-semibold text-white">Could not load assessment</h2>
        <p className="mt-2 text-slate-400">{error ?? "Unknown error"}</p>
        <p className="mt-4 text-sm text-slate-500">
          Start the API with{" "}
          <code className="rounded bg-black/30 px-1">cd backend && python app.py</code> and ensure{" "}
          <code className="rounded bg-black/30 px-1">loan_model_final.pkl</code> is in the project
          root.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Loan Risk Assessment</h1>
        <p className="mt-2 text-slate-400">
          Explainable Credit Risk Assessment using XGBoost and SHAP TreeExplainer
        </p>
        {formOptions.model?.threshold != null ? (
          <p className="mt-2 text-xs text-slate-500">
            Model threshold: {formOptions.model.threshold.toFixed(2)} (from loan_model_final.pkl)
          </p>
        ) : null}
        {modelReady === false ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formOptions.model?.error ??
              "Model not loaded. Place loan_model_final.pkl in the project root and restart Flask."}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-8">
        <LoanForm
          form={form}
          options={formOptions}
          onChange={setForm}
          onSubmit={handlePredict}
          loading={loading}
        />

        <div ref={resultsRef}>
          {loading ? (
            <Card className="flex min-h-[320px] flex-col items-center justify-center border-dashed border-sky-400/30">
              <CardContent className="flex flex-col items-center gap-4 p-10">
                <Loader2 className="h-12 w-12 animate-spin text-sky-400" />
                <p className="text-slate-300">Running XGBoost inference and SHAP explainability…</p>
              </CardContent>
            </Card>
          ) : result ? (
            <PredictionDashboard result={result} form={form} />
          ) : (
            <Card className="flex min-h-[320px] flex-col items-center justify-center border-dashed border-white/15 text-center">
              <CardContent className="flex max-w-md flex-col items-center gap-4 p-10">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-600/20">
                  <ClipboardList className="h-10 w-10 text-sky-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Awaiting Assessment</h3>
                <p className="text-slate-400">
                  Enter applicant details and click Predict Risk to generate a model-driven risk
                  assessment with SHAP explainability.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
