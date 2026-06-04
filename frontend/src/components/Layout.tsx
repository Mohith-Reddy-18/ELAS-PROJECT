import { Link, Outlet, useLocation } from "react-router-dom";
import { Building2, LineChart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-white">ELAS Risk</p>
              <p className="text-xs text-slate-400">Explainable Loan Analytics</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" label="Home" active={location.pathname === "/"} />
            <NavLink to="/assess" label="Assessment" active={location.pathname === "/assess"} />
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/assess">Start Assessment</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/assess">Predict Risk</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-slate-500 sm:flex-row sm:text-left">
          <p className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-sky-400" />
            Powered by XGBoost • SHAP TreeExplainer • ReportLab
          </p>
          <p className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-emerald-400" />
            Model-driven decisions — no rule-based scoring
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "rounded-lg px-4 py-2 text-sm font-medium transition",
        active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
      )}
    >
      {label}
    </Link>
  );
}
