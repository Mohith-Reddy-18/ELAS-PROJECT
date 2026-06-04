import type { PlotlyFigureJson } from "@/components/PlotlyChart";

export interface ApplicantForm {
  loan_amnt: number;
  term: string | number;
  int_rate: number;
  emp_length: string;
  annual_inc: number;
  dti: number;
  delinq_2yrs: number;
  open_acc: number;
  pub_rec: number;
  revol_bal: number;
  revol_util: number;
  home_ownership: string;
  purpose: string;
}

export interface ShapContribution {
  feature: string;
  label: string;
  impact: number;
  value: number;
}

export interface PredictionDetails {
  label: string;
  is_safe: boolean;
  predicted_class: number;
  prob_safe: number;
  prob_risk: number;
  pred_probability_pct: number;
  confidence_pct: number;
  risk_pct: number;
  risk_category: string;
  threshold: number;
  risk_bands: {
    low_max_pct: number;
    moderate_max_pct: number;
  };
  decision_rule: string;
}

export interface AssessmentResult {
  summary: string;
  key_drivers: string[];
  top_risk_factors: string[];
  top_positive_factors: string[];
}

export interface PredictResponse {
  prediction: string;
  probability: number;
  confidence: number;
  prediction_details: PredictionDetails;
  assessment: AssessmentResult;
  shap: {
    contributions: ShapContribution[];
    positive: ShapContribution[];
    negative: ShapContribution[];
    expected_value: number;
  };
  engineered_features: {
    loan_income_ratio: number;
    credit_history_risk: number;
    debt_load: number;
  };
  charts: {
    gauge: PlotlyFigureJson;
    waterfall: PlotlyFigureJson;
    shap_waterfall_png: string;
  };
}

export interface FormOptions {
  emp_length: string[];
  home_ownership: string[];
  purpose: string[];
  term: string[];
  defaults: ApplicantForm;
  constraints: Record<string, { min: number; max: number; step?: number }>;
  model?: { loaded: boolean; threshold?: number | null; error?: string };
}

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function fetchFormOptions(): Promise<FormOptions> {
  const response = await fetch(`${API_BASE}/api/options`);
  const data = (await response.json()) as FormOptions & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load form options from API");
  }
  return data;
}

export async function predictRisk(form: ApplicantForm): Promise<PredictResponse> {
  const response = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });

  let data: PredictResponse & { error?: string };
  try {
    data = (await response.json()) as PredictResponse & { error?: string };
  } catch {
    throw new Error(
      "Invalid response from server. Is the Flask API running on port 5000?",
    );
  }
  if (!response.ok) {
    throw new Error(data.error ?? "Prediction request failed");
  }
  if (typeof data.prediction !== "string" || data.prediction_details == null) {
    throw new Error("Invalid prediction payload from server.");
  }
  return data;
}

export async function downloadReport(form: ApplicantForm): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Report download failed");
  }
  return response.blob();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (!response.ok) return false;
    const data = (await response.json()) as { model_loaded?: boolean };
    return Boolean(data.model_loaded);
  } catch {
    return false;
  }
}
