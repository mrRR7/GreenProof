import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, Loader2, AlertTriangle, Info } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface CompanyInputs {
  Revenue:           string;
  CarbonEmissions:   string;
  EnergyConsumption: string;
  WaterUsage:        string;
  ESG_Environmental: string;
  ESG_Overall:       string;
}

interface IntegrityResult {
  integrity_score:  number;
  is_suspicious:    boolean;
  confidence:       number;
  method:           string;
  explanations:     string[];
  metrics: {
    carbon_intensity:  number;
    energy_intensity:  number;
    water_intensity:   number;
    esg_environmental: number;
    esg_overall:       number;
  };
}

// ── Field config ───────────────────────────────────────────────────────────────

const FIELDS: { key: keyof CompanyInputs; label: string; unit: string; placeholder: string }[] = [
  { key: "Revenue",           label: "Annual Revenue",        unit: "$M",          placeholder: "e.g. 500" },
  { key: "CarbonEmissions",   label: "CO₂ Emissions",         unit: "tonnes/yr",   placeholder: "e.g. 12000" },
  { key: "EnergyConsumption", label: "Energy Consumption",    unit: "MWh/yr",      placeholder: "e.g. 8500" },
  { key: "WaterUsage",        label: "Water Usage",           unit: "ML/yr",       placeholder: "e.g. 4.2" },
  { key: "ESG_Environmental", label: "Environmental Score",   unit: "0-100",       placeholder: "e.g. 65" },
  { key: "ESG_Overall",       label: "Overall ESG Score",     unit: "0-100",       placeholder: "e.g. 58" },
];

const EMPTY: CompanyInputs = {
  Revenue: "", CarbonEmissions: "", EnergyConsumption: "",
  WaterUsage: "", ESG_Environmental: "", ESG_Overall: "",
};

// ── Helper ─────────────────────────────────────────────────────────────────────

function MetricBar({ label, value, threshold, unit }: {
  label: string; value: number; threshold: number; unit: string;
}) {
  const over = value > threshold;
  const pct  = Math.min(100, (value / (threshold * 2)) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-semibold ${over ? "text-red-600" : "text-emerald-600"}`}>
          {value.toFixed(3)} {unit}
          {over && <span className="ml-1 text-red-400">(above {threshold} threshold)</span>}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-red-400" : "bg-emerald-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  /** Optional: pre-fill from simulation results */
  prefillFromSimulation?: {
    co2_tonnes:        number;
    energy_mwh:        number;
    water_megalitres:  number;
    esg_environmental: number;
    esg_overall:       number;
  } | null;
}

export function IntegrityChecker({ prefillFromSimulation }: Props) {
  const [inputs, setInputs]   = useState<CompanyInputs>(EMPTY);
  const [result, setResult]   = useState<IntegrityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  // Auto-fill from simulation if provided
  const handlePrefill = () => {
    if (!prefillFromSimulation) return;
    setInputs(prev => ({
      ...prev,
      CarbonEmissions:   String(prefillFromSimulation.co2_tonnes),
      EnergyConsumption: String(prefillFromSimulation.energy_mwh),
      WaterUsage:        String(prefillFromSimulation.water_megalitres),
      ESG_Environmental: String(prefillFromSimulation.esg_environmental),
      ESG_Overall:       String(prefillFromSimulation.esg_overall),
    }));
  };

  const runCheck = async () => {
    // Validate all fields filled
    for (const f of FIELDS) {
      if (!inputs[f.key] || isNaN(Number(inputs[f.key]))) {
        setError(`Please enter a valid number for "${f.label}"`);
        return;
      }
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = Object.fromEntries(
        Object.entries(inputs).map(([k, v]) => [k, parseFloat(v)])
      );

      const res = await fetch("http://localhost:8000/api/integrity/check", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Backend error ${res.status}`);
      const data = await res.json();
      setResult(data.result);
      setModelUsed(data.model_used);
    } catch (e: any) {
      setError(e.message ?? "Could not reach backend");
    } finally {
      setLoading(false);
    }
  };

  const isSuspicious = result?.is_suspicious;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-violet-500" />
          ML Integrity Checker
        </h3>
        {modelUsed && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            modelUsed === "ml_model"
              ? "bg-violet-100 text-violet-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {modelUsed === "ml_model" ? "🤖 Isolation Forest" : "⚠️ Rule-based fallback"}
          </span>
        )}
      </div>

      {/* Pre-fill button */}
      {prefillFromSimulation && (
        <button
          onClick={handlePrefill}
          className="w-full text-sm text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 py-2 rounded-xl transition-colors font-medium"
        >
          ↑ Auto-fill from simulation results
        </button>
      )}

      {/* Input fields */}
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label, unit, placeholder }) => (
          <div key={key} className="space-y-1">
            <label className="text-xs font-medium text-slate-600">
              {label}
              <span className="ml-1 text-slate-400">({unit})</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder={placeholder}
              value={inputs[key]}
              onChange={e => setInputs(p => ({ ...p, [key]: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        ))}
      </div>

      {/* Run button */}
      <button
        onClick={runCheck}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white py-3 rounded-xl font-semibold transition-colors"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Analysing…</>
        ) : (
          <><ShieldAlert className="w-4 h-4" /> Run Integrity Check</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-5 space-y-4 ${
          isSuspicious
            ? "bg-red-50 border-red-200"
            : "bg-emerald-50 border-emerald-200"
        }`}>
          {/* Verdict */}
          <div className="flex items-center gap-3">
            {isSuspicious ? (
              <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-emerald-500 flex-shrink-0" />
            )}
            <div>
              <div className={`text-lg font-bold ${isSuspicious ? "text-red-700" : "text-emerald-700"}`}>
                {isSuspicious ? "⚠️ Suspicious — Potential Greenwashing" : "✅ Metrics Look Consistent"}
              </div>
              <div className="text-sm text-slate-500">
                Anomaly score: {result.integrity_score.toFixed(4)}
                {isSuspicious && ` · Confidence: ${Math.round(result.confidence * 100)}%`}
              </div>
            </div>
          </div>

          {/* Intensity metrics */}
          <div className="bg-white/70 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Intensity Metrics</p>
            <MetricBar label="Carbon Intensity"  value={result.metrics.carbon_intensity}  threshold={0.5} unit="t/$M" />
            <MetricBar label="Energy Intensity"  value={result.metrics.energy_intensity}  threshold={0.7} unit="MWh/$M" />
            <MetricBar label="Water Intensity"   value={result.metrics.water_intensity}   threshold={0.3} unit="ML/$M" />
          </div>

          {/* Explanations */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Model Reasoning</p>
            {result.explanations.map((exp, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400" />
                <span className="text-slate-700">{exp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
