"""Flask REST API for loan risk prediction."""

from __future__ import annotations

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from io import BytesIO

from config import CORS_ORIGINS
from utils import (
    EMP_LENGTH_OPTIONS,
    HOME_OWNERSHIP_OPTIONS,
    PURPOSE_VALUES,
    build_pdf_report,
    get_artifacts,
    get_form_options,
    init_model_artifacts,
    model_available,
    normalize_purpose,
    normalize_term,
    run_prediction_pipeline,
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": CORS_ORIGINS}})

REQUIRED_FIELDS = [
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
    "home_ownership",
    "purpose",
]


def _startup_load_model() -> None:
    if model_available():
        init_model_artifacts()
        app.logger.info("Loaded loan_model_final.pkl (model, scaler, threshold)")


_startup_load_model()


def validate_form(payload: dict) -> tuple[dict | None, tuple | None]:
    missing = [field for field in REQUIRED_FIELDS if field not in payload]
    if missing:
        return None, (jsonify({"error": "Missing required fields", "fields": missing}), 400)

    if payload["emp_length"] not in EMP_LENGTH_OPTIONS:
        return None, (jsonify({"error": "Invalid emp_length"}), 400)

    home = str(payload["home_ownership"]).upper()
    if home not in HOME_OWNERSHIP_OPTIONS:
        return None, (jsonify({"error": "Invalid home_ownership"}), 400)

    try:
        normalize_purpose(str(payload["purpose"]))
        normalize_term(payload["term"])
    except ValueError as exc:
        return None, (jsonify({"error": str(exc)}), 400)

    try:
        form = {
            "loan_amnt": float(payload["loan_amnt"]),
            "term": payload["term"],
            "int_rate": float(payload["int_rate"]),
            "emp_length": str(payload["emp_length"]),
            "annual_inc": float(payload["annual_inc"]),
            "dti": float(payload["dti"]),
            "delinq_2yrs": float(payload["delinq_2yrs"]),
            "open_acc": float(payload["open_acc"]),
            "pub_rec": float(payload["pub_rec"]),
            "revol_bal": float(payload["revol_bal"]),
            "revol_util": float(payload["revol_util"]),
            "home_ownership": home,
            "purpose": normalize_purpose(str(payload["purpose"])),
        }
    except (TypeError, ValueError):
        return None, (jsonify({"error": "Invalid numeric field values"}), 400)

    if purpose not in PURPOSE_VALUES:
        return None, (jsonify({"error": "Invalid purpose"}), 400)

    return form, None


@app.get("/health")
def health():
    loaded = False
    try:
        get_artifacts()
        loaded = True
    except RuntimeError:
        pass
    return jsonify({"status": "ok", "model_loaded": loaded})


@app.get("/api/options")
def options():
    """Form metadata always available; threshold included when model is loaded."""
    if model_available() and not _artifacts_ready():
        try:
            init_model_artifacts()
        except Exception as exc:
            app.logger.error("Model load failed: %s", exc)
    payload = get_form_options()
    if not model_available():
        payload["model"] = {
            "loaded": False,
            "error": "loan_model_final.pkl not found in project root",
        }
    return jsonify(payload)


def _artifacts_ready() -> bool:
    try:
        get_artifacts()
        return True
    except RuntimeError:
        return False


@app.post("/predict")
@app.post("/api/predict")
def predict():
    if not model_available():
        return (
            jsonify(
                {
                    "error": "Model file loan_model_final.pkl not found. Place it in the project root.",
                }
            ),
            503,
        )

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "JSON body required"}), 400

    form, error_response = validate_form(payload)
    if error_response:
        return error_response

    try:
        result = run_prediction_pipeline(form)
        return jsonify(result)
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 503
    except Exception as exc:
        return jsonify({"error": "Prediction failed", "detail": str(exc)}), 500


@app.post("/api/report")
def report():
    if not model_available():
        return jsonify({"error": "loan_model_final.pkl not found."}), 503

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "JSON body required"}), 400

    form, error_response = validate_form(payload)
    if error_response:
        return error_response

    try:
        result = run_prediction_pipeline(form)
        details = result["prediction_details"]
        pdf_bytes = build_pdf_report(
            form,
            {**details, "label": result["prediction"], "probability": result["probability"], "confidence": result["confidence"]},
            result["assessment"],
            result["shap"],
        )
        return send_file(
            BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name="loan_risk_report.pdf",
        )
    except Exception as exc:
        return jsonify({"error": "Report generation failed", "detail": str(exc)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
