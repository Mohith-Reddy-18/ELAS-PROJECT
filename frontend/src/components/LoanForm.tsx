import type { ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { ApplicantForm, FormOptions } from "@/lib/api";

interface LoanFormProps {
  form: ApplicantForm;
  options: FormOptions;
  onChange: (form: ApplicantForm) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function LoanForm({ form, options, onChange, onSubmit, loading }: LoanFormProps) {
  const c = options.constraints;

  const update = <K extends keyof ApplicantForm>(key: K, value: ApplicantForm[K]) => {
    onChange({ ...form, [key]: value });
  };

  const hintRange = (key: keyof FormOptions["constraints"]) => {
    const rule = c[key];
    return `${rule.min} – ${rule.max}`;
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-sky-400" />
          Loan Application
        </CardTitle>
        <CardDescription>
          Options and limits loaded from the API — engineered features computed server-side.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-6 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <Field label="Loan Amount ($)" hint={hintRange("loan_amnt")}>
            <Input
              type="number"
              min={c.loan_amnt.min}
              max={c.loan_amnt.max}
              value={form.loan_amnt}
              onChange={(e) => update("loan_amnt", Number(e.target.value))}
            />
          </Field>

          <Field label="Loan Term">
            <Select value={String(form.term)} onValueChange={(v) => update("term", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.term.map((label) => (
                  <SelectItem key={label} value={label}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={`Interest Rate: ${form.int_rate.toFixed(1)}%`}
            hint={`${c.int_rate.min}% – ${c.int_rate.max}%`}
          >
            <Slider
              min={c.int_rate.min}
              max={c.int_rate.max}
              step={c.int_rate.step ?? 0.1}
              value={[form.int_rate]}
              onValueChange={([v]) => update("int_rate", v)}
            />
          </Field>

          <Field label="Annual Income ($)" hint={hintRange("annual_inc")}>
            <Input
              type="number"
              min={c.annual_inc.min}
              max={c.annual_inc.max}
              value={form.annual_inc}
              onChange={(e) => update("annual_inc", Number(e.target.value))}
            />
          </Field>

          <Field
            label={`Debt-to-Income (DTI): ${form.dti.toFixed(1)}%`}
            hint={`${c.dti.min}% – ${c.dti.max}%`}
          >
            <Slider
              min={c.dti.min}
              max={c.dti.max}
              step={c.dti.step ?? 0.1}
              value={[form.dti]}
              onValueChange={([v]) => update("dti", v)}
            />
          </Field>

          <Field label="Employment Length">
            <Select value={form.emp_length} onValueChange={(v) => update("emp_length", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.emp_length.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Open Accounts" hint={hintRange("open_acc")}>
            <Input
              type="number"
              min={c.open_acc.min}
              max={c.open_acc.max}
              value={form.open_acc}
              onChange={(e) => update("open_acc", Number(e.target.value))}
            />
          </Field>

          <Field label="Public Records" hint={hintRange("pub_rec")}>
            <Input
              type="number"
              min={c.pub_rec.min}
              max={c.pub_rec.max}
              value={form.pub_rec}
              onChange={(e) => update("pub_rec", Number(e.target.value))}
            />
          </Field>

          <Field label="Delinquencies (2 yrs)" hint={hintRange("delinq_2yrs")}>
            <Input
              type="number"
              min={c.delinq_2yrs.min}
              max={c.delinq_2yrs.max}
              value={form.delinq_2yrs}
              onChange={(e) => update("delinq_2yrs", Number(e.target.value))}
            />
          </Field>

          <Field label="Revolving Balance ($)" hint={hintRange("revol_bal")}>
            <Input
              type="number"
              min={c.revol_bal.min}
              max={c.revol_bal.max}
              value={form.revol_bal}
              onChange={(e) => update("revol_bal", Number(e.target.value))}
            />
          </Field>

          <Field
            label={`Revolving Utilization: ${form.revol_util}%`}
            hint={`${c.revol_util.min}% – ${c.revol_util.max}%`}
          >
            <Slider
              min={c.revol_util.min}
              max={c.revol_util.max}
              step={c.revol_util.step ?? 1}
              value={[form.revol_util]}
              onValueChange={([v]) => update("revol_util", v)}
            />
          </Field>

          <Field label="Home Ownership">
            <Select
              value={form.home_ownership}
              onValueChange={(v) => update("home_ownership", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.home_ownership.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Loan Purpose">
            <Select value={form.purpose} onValueChange={(v) => update("purpose", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.purpose.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="md:col-span-2">
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running XGBoost + SHAP…
                </>
              ) : (
                "Predict Risk"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
