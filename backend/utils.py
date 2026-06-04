"""Model inference, SHAP explainability, and report helpers."""

from __future__ import annotations

import base64
import io
import pickle
from datetime import datetime
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import shap
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from config import MODEL_PATH

FEATURE_COLUMNS = [
    "loan_amnt",
    "term",
    "int_rate",
    "emp_length",
    "annual_inc",
    "dti",
    "delinq_2yrs",
    "open_acc",
    "pub_rec",
    "revol_bal",
    "revol_util",
    "home_ownership_OTHER",
    "home_ownership_OWN",
    "home_ownership_RENT",
    "purpose_credit_card",
    "purpose_debt_consolidation",
    "purpose_home_improvement",
    "purpose_house",
    "purpose_major_purchase",
    "purpose_medical",
    "purpose_moving",
    "purpose_other",
    "purpose_small_business",
    "purpose_vacation",
    "loan_income_ratio",
    "credit_history_risk",
    "debt_load",
]

FEATURE_LABELS = {
    "loan_amnt": "Loan Amount",
    "term": "Loan Term",
    "int_rate": "Interest Rate",
    "emp_length": "Employment Length",
    "annual_inc": "Annual Income",
    "dti": "Debt-to-Income Ratio",
    "delinq_2yrs": "Delinquencies (2 yrs)",
    "open_acc": "Open Accounts",
    "pub_rec": "Public Records",
    "revol_bal": "Revolving Balance",
    "revol_util": "Revolving Utilization",
    "home_ownership_OTHER": "Home Ownership (Other)",
    "home_ownership_OWN": "Home Ownership (Own)",
    "home_ownership_RENT": "Home Ownership (Rent)",
    "purpose_credit_card": "Purpose: Credit Card",
    "purpose_debt_consolidation": "Purpose: Debt Consolidation",
    "purpose_home_improvement": "Purpose: Home Improvement",
    "purpose_house": "Purpose: House",
    "purpose_major_purchase": "Purpose: Major Purchase",
    "purpose_medical": "Purpose: Medical",
    "purpose_moving": "Purpose: Moving",
    "purpose_other": "Purpose: Other",
    "purpose_small_business": "Purpose: Small Business",
    "purpose_vacation": "Purpose: Vacation",
    "loan_income_ratio": "Loan-to-Income Ratio",
    "credit_history_risk": "Credit History Risk",
    "debt_load": "Debt Load",
}

EMP_LENGTH_OPTIONS = {
    "< 1 year": 0,
    "1 year": 1,
    "2 years": 2,
    "3 years": 3,
    "4 years": 4,
    "5 years": 5,
    "6 years": 6,
    "7 years": 7,
    "8 years": 8,
    "9 years": 9,
    "10+ years": 10,
}

TERM_OPTIONS = {
    "36 Months": 36,
    "60 Months": 60,
    36: 36,
    60: 60,
    "36": 36,
    "60": 60,
}

PURPOSE_VALUES = (
    "credit_card",
    "debt_consolidation",
    "home_improvement",
    "house",
    "major_purchase",
    "medical",
    "moving",
    "other",
    "small_business",
    "vacation",
)

# Legacy Title Case → snake_case (frontend may send either)
PURPOSE_ALIASES = {
    "credit card": "credit_card",
    "debt consolidation": "debt_consolidation",
    "home improvement": "home_improvement",
    "major purchase": "major_purchase",
    "small business": "small_business",
}

HOME_OWNERSHIP_OPTIONS = ("RENT", "OWN", "OTHER")

# Loaded once at application startup (see init_model_artifacts)
_model = None
_scaler = None
_threshold: float | None = None
_artifacts_loaded = False


def model_available() -> bool:
    return MODEL_PATH.is_file()


def init_model_artifacts(model_path: Path = MODEL_PATH) -> None:
    """Load model, scaler, and threshold once when Flask starts."""
    global _model, _scaler, _threshold, _artifacts_loaded

    if _artifacts_loaded:
        return

    if not model_path.is_file():
        raise FileNotFoundError(
            f"Model file not found at {model_path}. Place loan_model_final.pkl in the project root."
        )

    with open(model_path, "rb") as file:
        bundle = pickle.load(file)

    for key in ("model", "scaler", "threshold"):
        if key not in bundle:
            raise ValueError(f"loan_model_final.pkl must contain '{key}'.")

    _model = bundle["model"]
    _scaler = bundle["scaler"]
    _threshold = float(bundle["threshold"])
    _artifacts_loaded = True


def get_artifacts() -> tuple[Any, Any, float]:
    if not _artifacts_loaded:
        raise RuntimeError("Model artifacts not loaded. Call init_model_artifacts() at startup.")
    assert _model is not None and _scaler is not None and _threshold is not None
    return _model, _scaler, _threshold


def normalize_purpose(purpose: str) -> str:
    key = purpose.strip().lower().replace(" ", "_")
    if key in PURPOSE_VALUES:
        return key
    if key in PURPOSE_ALIASES:
        return PURPOSE_ALIASES[key]
    raise ValueError(f"Invalid purpose: {purpose}")


def normalize_term(term: Any) -> int:
    if term in TERM_OPTIONS:
        return int(TERM_OPTIONS[term])
    raise ValueError(f"Invalid term: {term}. Use 36, 60, '36 Months', or '60 Months'.")


def get_form_options() -> dict[str, Any]:
    threshold = float(_threshold) if _artifacts_loaded and _threshold is not None else None
    return {
        "emp_length": list(EMP_LENGTH_OPTIONS.keys()),
        "home_ownership": list(HOME_OWNERSHIP_OPTIONS),
        "purpose": list(PURPOSE_VALUES),
        "term": ["36 Months", "60 Months"],
        "defaults": {
            "loan_amnt": 10000,
            "term": "36 Months",
            "int_rate": 15.0,
            "annual_inc": 50000,
            "dti": 15.0,
            "emp_length": "5 years",
            "open_acc": 5,
            "pub_rec": 0,
            "delinq_2yrs": 0,
            "revol_bal": 5000,
            "revol_util": 30.0,
            "home_ownership": "RENT",
            "purpose": "debt_consolidation",
        },
        "constraints": {
            "loan_amnt": {"min": 500, "max": 50000},
            "int_rate": {"min": 5, "max": 35, "step": 0.1},
            "annual_inc": {"min": 10000, "max": 500000},
            "dti": {"min": 0, "max": 50, "step": 0.1},
            "open_acc": {"min": 0, "max": 50},
            "pub_rec": {"min": 0, "max": 10},
            "delinq_2yrs": {"min": 0, "max": 20},
            "revol_bal": {"min": 0, "max": 100000},
            "revol_util": {"min": 0, "max": 100, "step": 1},
        },
        "model": {"loaded": _artifacts_loaded, "threshold": threshold},
    }


def build_feature_row(form: dict[str, Any]) -> pd.DataFrame:
    """
    User input → feature engineering → DataFrame in exact training column order.
    """
    row = {column: 0.0 for column in FEATURE_COLUMNS}

    row["loan_amnt"] = float(form["loan_amnt"])
    row["term"] = float(normalize_term(form["term"]))
    row["int_rate"] = float(form["int_rate"])
    row["emp_length"] = float(EMP_LENGTH_OPTIONS[form["emp_length"]])
    row["annual_inc"] = float(form["annual_inc"])
    row["dti"] = float(form["dti"])
    row["delinq_2yrs"] = float(form["delinq_2yrs"])
    row["open_acc"] = float(form["open_acc"])
    row["pub_rec"] = float(form["pub_rec"])
    row["revol_bal"] = float(form["revol_bal"])
    row["revol_util"] = float(form["revol_util"])

    home = str(form["home_ownership"]).upper()
    if home not in HOME_OWNERSHIP_OPTIONS:
        raise ValueError(f"Invalid home_ownership: {home}")
    row[f"home_ownership_{home}"] = 1.0

    purpose_key = normalize_purpose(str(form["purpose"]))
    row[f"purpose_{purpose_key}"] = 1.0

    row["loan_income_ratio"] = row["loan_amnt"] / (row["annual_inc"] + 1)
    row["credit_history_risk"] = row["delinq_2yrs"] + row["pub_rec"]
    row["debt_load"] = row["dti"] * row["loan_amnt"]

    return pd.DataFrame([row])[FEATURE_COLUMNS]


def scale_features(features: pd.DataFrame) -> np.ndarray:
    _, scaler, _ = get_artifacts()
    return scaler.transform(features)


def _risk_bands_from_threshold(threshold: float) -> dict[str, float]:
    boundary_pct = (1.0 - threshold) * 100.0
    return {
        "low_max_pct": boundary_pct * 0.5,
        "moderate_max_pct": boundary_pct,
    }


def _risk_category(risk_pct: float, bands: dict[str, float]) -> str:
    if risk_pct <= bands["low_max_pct"]:
        return "Low Risk"
    if risk_pct <= bands["moderate_max_pct"]:
        return "Moderate Risk"
    return "High Risk"


def _gauge_color(risk_pct: float, bands: dict[str, float]) -> str:
    if risk_pct <= bands["low_max_pct"]:
        return "#22c55e"
    if risk_pct <= bands["moderate_max_pct"]:
        return "#f59e0b"
    return "#ef4444"


def predict(form: dict[str, Any]) -> dict[str, Any]:
    """
    Feature engineering → DataFrame → scaler.transform() → predict_proba() → threshold.
    """
    model, scaler, threshold = get_artifacts()
    features = build_feature_row(form)
    data_scaled = scaler.transform(features)

    proba = model.predict_proba(data_scaled)[0]
    prob_safe = float(proba[1])
    prob_risk = float(proba[0])
    predicted_class = int(prob_safe >= threshold)
    is_safe = predicted_class == 1

    label = "SAFE LOAN" if is_safe else "RISKY LOAN"
    outcome_probability = prob_safe if is_safe else prob_risk
    confidence = round(outcome_probability * 100, 2)

    bands = _risk_bands_from_threshold(threshold)
    risk_pct = prob_risk * 100.0

    return {
        "label": label,
        "predicted_class": predicted_class,
        "is_safe": is_safe,
        "prob_safe": prob_safe,
        "prob_risk": prob_risk,
        "probability": round(outcome_probability, 4),
        "confidence": confidence,
        "threshold": threshold,
        "decision_rule": (
            f"prob_safe ({prob_safe:.4f}) >= threshold ({threshold:.2f})"
            if is_safe
            else f"prob_safe ({prob_safe:.4f}) < threshold ({threshold:.2f})"
        ),
        "risk_pct": risk_pct,
        "risk_category": _risk_category(risk_pct, bands),
        "risk_bands": bands,
        "features": features,
        "data_scaled": data_scaled,
    }


def compute_shap(features: pd.DataFrame, data_scaled: np.ndarray) -> dict[str, Any]:
    model, _, _ = get_artifacts()
    explainer = shap.TreeExplainer(model)
    explanation = explainer(data_scaled)
    instance = explanation[0]

    contributions = []
    for idx, column in enumerate(FEATURE_COLUMNS):
        value = float(instance.values[idx])
        if abs(value) < 1e-8:
            continue
        contributions.append(
            {
                "feature": column,
                "label": FEATURE_LABELS.get(column, column),
                "impact": value,
                "value": float(features.iloc[0][column]),
            }
        )

    contributions.sort(key=lambda item: abs(item["impact"]), reverse=True)
    positive = [c for c in contributions if c["impact"] > 0]
    negative = [c for c in contributions if c["impact"] < 0]

    return {
        "contributions": contributions,
        "positive": positive,
        "negative": negative,
        "expected_value": float(np.ravel(instance.base_values)[0]),
        "_instance": instance,
    }


def shap_waterfall_png(instance: Any, max_display: int = 12) -> str:
    plt.close("all")
    shap.plots.waterfall(instance, max_display=max_display, show=False)
    fig = plt.gcf()
    fig.patch.set_facecolor("#0f172a")
    buffer = io.BytesIO()
    fig.savefig(
        buffer,
        format="png",
        dpi=140,
        bbox_inches="tight",
        facecolor=fig.get_facecolor(),
    )
    plt.close(fig)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode("ascii")


def risk_gauge_figure(risk_pct: float, risk_category: str, bands: dict[str, float]) -> go.Figure:
    bar_color = _gauge_color(risk_pct, bands)
    low = bands["low_max_pct"]
    mod = bands["moderate_max_pct"]

    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=risk_pct,
            number={"suffix": "%", "font": {"size": 42, "color": "#f8fafc"}},
            title={
                "text": (
                    f"Risk Probability<br>"
                    f"<span style='font-size:14px;color:#94a3b8'>{risk_category}</span>"
                )
            },
            gauge={
                "axis": {"range": [0, 100], "tickwidth": 1, "tickcolor": "#64748b"},
                "bar": {"color": bar_color, "thickness": 0.28},
                "bgcolor": "#1e293b",
                "borderwidth": 0,
                "steps": [
                    {"range": [0, low], "color": "rgba(34,197,94,0.18)"},
                    {"range": [low, mod], "color": "rgba(245,158,11,0.18)"},
                    {"range": [mod, 100], "color": "rgba(239,68,68,0.18)"},
                ],
                "threshold": {
                    "line": {"color": "#f8fafc", "width": 2},
                    "thickness": 0.75,
                    "value": risk_pct,
                },
            },
        )
    )
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#e2e8f0", "family": "Segoe UI, sans-serif"},
        height=280,
        margin=dict(l=24, r=24, t=56, b=12),
    )
    return fig


def shap_waterfall_plotly(shap_data: dict[str, Any]) -> go.Figure:
    items = shap_data["contributions"][:12]
    if not items:
        fig = go.Figure()
        fig.add_annotation(text="No significant SHAP contributors", showarrow=False)
        return fig

    labels = [item["label"] for item in items]
    impacts = [item["impact"] for item in items]

    fig = go.Figure(
        go.Waterfall(
            name="SHAP",
            orientation="h",
            measure=["relative"] * len(impacts) + ["total"],
            y=labels + ["Model output"],
            x=impacts + [sum(impacts)],
            textposition="outside",
            connector={"line": {"color": "rgba(148,163,184,0.4)"}},
            decreasing={"marker": {"color": "#ef4444"}},
            increasing={"marker": {"color": "#22c55e"}},
            totals={"marker": {"color": "#38bdf8"}},
        )
    )
    fig.update_traces(text=[f"{v:+.3f}" for v in impacts] + [f"{sum(impacts):+.3f}"])
    fig.update_layout(
        title="SHAP Waterfall (TreeExplainer)",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#e2e8f0"},
        height=max(360, 40 * len(labels)),
        margin=dict(l=160, r=24, t=48, b=24),
        showlegend=False,
        xaxis={"title": "SHAP value", "gridcolor": "rgba(148,163,184,0.15)", "zerolinecolor": "#64748b"},
    )
    return fig


def _format_impact(impact: float) -> str:
    sign = "+" if impact > 0 else ""
    return f"{sign}{impact:.4f}"


def build_assessment_summary(prediction: dict[str, Any], shap_data: dict[str, Any]) -> dict[str, Any]:
    positive = shap_data["positive"][:3]
    negative = shap_data["negative"][:3]

    risk_level = prediction["risk_category"].lower()
    tone = "favorable" if prediction["is_safe"] else (
        "elevated" if prediction["risk_category"] == "High Risk" else "moderate"
    )

    driver_names = [item["label"] for item in (negative[:2] + positive[:2])]
    if not driver_names:
        driver_names = [item["label"] for item in shap_data["contributions"][:3]]

    summary = (
        f"This applicant demonstrates a {risk_level} credit profile with {tone} model signals. "
        f"The prediction is influenced primarily by {', '.join(driver_names[:3])}."
    )

    return {
        "summary": summary,
        "key_drivers": [item["label"] for item in shap_data["contributions"][:5]],
        "top_risk_factors": [item["label"] for item in negative[:3]],
        "top_positive_factors": [item["label"] for item in positive[:3]],
    }


def build_pdf_report(
    form: dict[str, Any],
    prediction: dict[str, Any],
    assessment: dict[str, Any],
    shap_data: dict[str, Any],
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Heading1"],
        fontSize=20,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=12,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=colors.HexColor("#1e3a5f"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = styles["BodyText"]

    story = [
        Paragraph("Loan Risk Assessment Report", title_style),
        Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", body_style),
        Spacer(1, 0.2 * inch),
        Paragraph("Applicant Information", section_style),
    ]

    applicant_rows = [
        ["Annual Income", f"${form['annual_inc']:,.0f}"],
        ["Employment Length", form["emp_length"]],
        ["Home Ownership", form["home_ownership"]],
        ["Open Accounts", str(form["open_acc"])],
        ["Public Records", str(form["pub_rec"])],
        ["Delinquencies (2 yrs)", str(form["delinq_2yrs"])],
    ]
    story.append(_pdf_table(applicant_rows))
    story.append(Paragraph("Loan Details", section_style))

    term_display = form["term"]
    loan_rows = [
        ["Loan Amount", f"${form['loan_amnt']:,.0f}"],
        ["Term", str(term_display)],
        ["Interest Rate", f"{form['int_rate']:.1f}%"],
        ["DTI", f"{form['dti']:.1f}%"],
        ["Purpose", str(form["purpose"])],
        ["Revolving Balance", f"${form['revol_bal']:,.0f}"],
        ["Revolving Utilization", f"{form['revol_util']:.1f}%"],
    ]
    story.append(_pdf_table(loan_rows))
    story.append(Paragraph("Prediction Result", section_style))

    result_rows = [
        ["Outcome", prediction["label"]],
        ["Probability", f"{prediction['probability']:.4f}"],
        ["Confidence", f"{prediction['confidence']:.2f}%"],
        ["Risk Category", prediction["risk_category"]],
        ["Risk Probability", f"{prediction['risk_pct']:.1f}%"],
        ["Threshold", f"{prediction['threshold']:.2f}"],
    ]
    story.append(_pdf_table(result_rows))
    story.append(Paragraph("Risk Assessment Summary", section_style))
    story.append(Paragraph(assessment["summary"], body_style))
    story.append(Paragraph("Key Drivers: " + ", ".join(assessment["key_drivers"]), body_style))
    story.append(Paragraph("SHAP Explanation Summary", section_style))

    shap_lines = []
    if shap_data["positive"]:
        shap_lines.append(
            "Top positive contributors: "
            + "; ".join(
                f"{c['label']} ({_format_impact(c['impact'])})" for c in shap_data["positive"][:5]
            )
        )
    if shap_data["negative"]:
        shap_lines.append(
            "Top negative contributors: "
            + "; ".join(
                f"{c['label']} ({_format_impact(c['impact'])})" for c in shap_data["negative"][:5]
            )
        )
    if not shap_lines:
        shap_lines.append("No significant SHAP contributors for this prediction.")

    for line in shap_lines:
        story.append(Paragraph(line, body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def _pdf_table(rows: list[list[str]]) -> Table:
    table = Table(rows, colWidths=[2.4 * inch, 4.0 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e2e8f0")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _public_shap(shap_data: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in shap_data.items() if not k.startswith("_")}


def _prediction_details(pred: dict[str, Any]) -> dict[str, Any]:
    """Dashboard-friendly view (excludes internal arrays)."""
    return {
        "label": pred["label"],
        "is_safe": pred["is_safe"],
        "predicted_class": pred["predicted_class"],
        "prob_safe": pred["prob_safe"],
        "prob_risk": pred["prob_risk"],
        "pred_probability_pct": pred["probability"] * 100,
        "confidence_pct": pred["confidence"],
        "risk_pct": pred["risk_pct"],
        "risk_category": pred["risk_category"],
        "threshold": pred["threshold"],
        "risk_bands": pred["risk_bands"],
        "decision_rule": pred["decision_rule"],
    }


def run_prediction_pipeline(form: dict[str, Any]) -> dict[str, Any]:
    pred = predict(form)
    features = pred.pop("features")
    data_scaled = pred.pop("data_scaled")

    shap_data = compute_shap(features, data_scaled)
    assessment = build_assessment_summary(pred, shap_data)

    instance = shap_data["_instance"]
    bands = pred["risk_bands"]

    gauge_fig = risk_gauge_figure(pred["risk_pct"], pred["risk_category"], bands)
    waterfall_fig = shap_waterfall_plotly(shap_data)
    shap_png = shap_waterfall_png(instance)

    engineered = {
        "loan_income_ratio": float(features.iloc[0]["loan_income_ratio"]),
        "credit_history_risk": float(features.iloc[0]["credit_history_risk"]),
        "debt_load": float(features.iloc[0]["debt_load"]),
    }

    details = _prediction_details(pred)

    return {
        "prediction": pred["label"],
        "probability": pred["probability"],
        "confidence": pred["confidence"],
        "prediction_details": details,
        "assessment": assessment,
        "shap": _public_shap(shap_data),
        "engineered_features": engineered,
        "charts": {
            "gauge": gauge_fig.to_plotly_json(),
            "waterfall": waterfall_fig.to_plotly_json(),
            "shap_waterfall_png": shap_png,
        },
    }
