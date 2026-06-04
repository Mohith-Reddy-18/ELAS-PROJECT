import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Brain,
  FileCheck,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "XGBoost Risk Model",
    description:
      "Every approval decision flows from loan_model_final.pkl predict_proba — no manual scoring rules.",
  },
  {
    icon: BarChart3,
    title: "SHAP Explainability",
    description:
      "TreeExplainer waterfall plots and contributor rankings from real prediction-time SHAP values.",
  },
  {
    icon: FileCheck,
    title: "PDF Reports",
    description:
      "One-click ReportLab exports with applicant profile, outcome, and SHAP narrative for demos.",
  },
  {
    icon: Shield,
    title: "Bank-Grade UX",
    description:
      "Glassmorphism dashboard with risk gauges, animated cards, and fintech-ready presentation.",
  },
];

export function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(56,189,248,0.12),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="glass-panel mx-auto max-w-4xl p-10 text-center md:p-14">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Loan Risk Prediction
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Explainable <span className="text-gradient">Credit Risk</span>
              <br />
              for Modern Lending
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
              Assess loan applications with production ML inference, interactive SHAP dashboards,
              and downloadable audit-ready PDF reports — built for academic demos and fintech
              portfolios.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/assess">
                  Start Assessment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="secondary" size="lg" asChild>
                <a href="#features">Explore Features</a>
              </Button>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-3">
            {[
              { label: "Model", value: "XGBoost", icon: Zap },
              { label: "Threshold", value: "0.70", icon: Shield },
              { label: "XAI", value: "SHAP", icon: BarChart3 },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label} className="text-center transition hover:-translate-y-1 hover:border-sky-400/30">
                <CardContent className="flex flex-col items-center gap-2 p-6">
                  <Icon className="h-6 w-6 text-sky-400" />
                  <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="text-xl font-bold text-white">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-white">Platform Capabilities</h2>
            <p className="mt-3 text-slate-400">
              Full-stack React + Flask architecture with REST API integration
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="transition duration-300 hover:-translate-y-1 hover:border-sky-400/25 hover:shadow-sky-500/10"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20">
                    <Icon className="h-6 w-6 text-sky-400" />
                  </div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="glass-panel mx-auto max-w-4xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to evaluate an application?</h2>
          <p className="mt-3 text-slate-400">
            Submit applicant details and receive model probability, risk gauge, SHAP breakdown, and
            PDF export.
          </p>
          <Button className="mt-8" size="lg" asChild>
            <Link to="/assess">
              Open Assessment Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
