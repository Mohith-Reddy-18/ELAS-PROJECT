# AI-Powered Loan Risk Prediction System

Full-stack explainable credit risk platform: **React + Vite + Tailwind + shadcn-style UI + Plotly** on the frontend, **Flask REST API** on the backend, with **XGBoost**, **SHAP TreeExplainer**, and **ReportLab** PDF reports.

## Project structure

```
ELAS-PROJECT/
├── loan_model_final.pkl          # Place your trained model here (project root)
├── backend/
│   ├── app.py               # Flask API — POST /predict, POST /api/report
│   ├── utils.py             # Feature engineering, ML, SHAP, PDF
│   ├── config.py
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── pages/           # Landing + Assessment dashboard
    │   ├── components/      # Form, gauges, SHAP, UI primitives
    │   └── lib/api.ts       # API client
    └── vite.config.ts       # Proxies /predict → Flask :5000
```

## Model setup

1. Copy `loan_model_final.pkl` to the **project root** (`ELAS-PROJECT/loan_model_final.pkl`).
2. The pickle should be a dict: `{ "model": <XGBClassifier>, "threshold": 0.70 }` (threshold optional; defaults to `0.70`).

Feature vector order (27 features):

`loan_amnt`, `term`, `int_rate`, `emp_length`, `annual_inc`, `dti`, `delinq_2yrs`, `open_acc`, `pub_rec`, `revol_bal`, `revol_util`, home ownership dummies, purpose dummies, `loan_income_ratio`, `credit_history_risk`, `debt_load`.

Engineered fields (computed in `backend/utils.py`):

- `loan_income_ratio = loan_amnt / (annual_inc + 1)`
- `credit_history_risk = delinq_2yrs + pub_rec`
- `debt_load = dti * loan_amnt`

## Run locally

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

API: `http://127.0.0.1:5000`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/predict` | POST | Full prediction + SHAP + Plotly JSON |
| `/api/report` | POST | PDF download (same JSON body) |
| `/health` | GET | API + model file status |

### Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: `http://localhost:5173` (Vite proxies API calls to Flask).

## API example

```bash
curl -X POST http://127.0.0.1:5000/predict \
  -H "Content-Type: application/json" \
  -d "{\"loan_amnt\":10000,\"term\":36,\"int_rate\":15,\"emp_length\":\"5 years\",\"annual_inc\":50000,\"dti\":15,\"delinq_2yrs\":0,\"open_acc\":5,\"pub_rec\":0,\"revol_bal\":5000,\"revol_util\":30,\"home_ownership\":\"RENT\",\"purpose\":\"Debt Consolidation\"}"
```

## Stack

- **Frontend:** React, Vite, Tailwind CSS v4, shadcn-style Radix components, Plotly
- **Backend:** Flask, flask-cors
- **ML:** XGBoost (`predict_proba`, threshold 0.70)
- **XAI:** `shap.TreeExplainer`
- **PDF:** ReportLab

All predictions and SHAP values are produced by the loaded model — no mock scores or fabricated explainability.
