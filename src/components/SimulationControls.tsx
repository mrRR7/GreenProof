import React, { useState } from "react";
import { Play, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { pythonApi, SimulationResults, ScenarioParams } from "../services/pythonApiService";

// ── Helpers ────────────────────────────────────────────────────────────────────

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  color = "emerald",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const colorMap: Record<string, string> = {
    emerald: "accent-emerald-600",
    blue:    "accent-blue-500",
    amber:   "accent-amber-500",
    violet:  "accent-violet-500",
  };
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="font-bold text-slate-800">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 rounded-lg cursor-pointer ${colorMap[color] ?? colorMap.emerald}`}
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function ResultCard({ label, value, unit, delta, highlight }: {
  label: string;
  value: string;
  unit: string;
  delta?: number;
  highlight?: "good" | "bad" | "neutral";
}) {
  const bg = highlight === "good" ? "bg-emerald-50 border-emerald-200"
           : highlight === "bad"  ? "bg-red-50 border-red-200"
           : "bg-slate-50 border-slate-200";
  const text = highlight === "good" ? "text-emerald-700"
             : highlight === "bad"  ? "text-red-700"
             : "text-slate-700";
  return (
    <div className={`rounded-xl border p-3 ${bg}`}>
      <div className="text-xs text-slate-500 mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${text}`}>
        {value}
        <span className="text-sm font-normal ml-1">{unit}</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  onResults?: (results: SimulationResults) => void;
}

export function SimulationControls({ onResults }: Props) {
  const [params, setParams] = useState<ScenarioParams>({
    production_volume: 100,
    renewable_energy_percent: 30,
    efficiency_rating: 0.85,
    waste_recycling_rate: 0.30,
    num_facilities: 1,
  });
  const [results, setResults]   = useState<SimulationResults | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const set = (key: keyof ScenarioParams) => (v: number) =>
    setParams((p) => ({ ...p, [key]: v }));

  const runSim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pythonApi.runScenario(params);
      setResults(res);
      onResults?.(res);
    } catch (e: any) {
      setError(e.message ?? "Backend unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      <h3 className="font-bold text-slate-800">Industry Simulator</h3>

      {/* Sliders */}
      <div className="space-y-4">
        <Slider
          label="Production Volume"
          value={params.production_volume}
          min={50} max={200} unit=" u/hr"
          color="emerald"
          onChange={set("production_volume")}
        />
        <Slider
          label="Renewable Energy"
          value={params.renewable_energy_percent}
          min={0} max={100} unit="%"
          color="blue"
          onChange={set("renewable_energy_percent")}
        />
        <Slider
          label="Operational Efficiency"
          value={Math.round(params.efficiency_rating * 100)}
          min={70} max={100} unit="%"
          color="amber"
          onChange={(v) => set("efficiency_rating")(v / 100)}
        />
        <Slider
          label="Waste Recycling Rate"
          value={Math.round(params.waste_recycling_rate * 100)}
          min={0} max={100} unit="%"
          color="violet"
          onChange={(v) => set("waste_recycling_rate")(v / 100)}
        />
        <Slider
          label="Number of Facilities"
          value={params.num_facilities}
          min={1} max={10} step={1} unit=""
          color="emerald"
          onChange={set("num_facilities")}
        />
      </div>

      {/* Run button */}
      <button
        onClick={runSim}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white py-3 rounded-xl font-semibold transition-colors"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Calculating…</>
        ) : (
          <><Play className="w-4 h-4" /> Run Simulation</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-700">Results (Annual)</h4>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              ESG Score: {results.scores.esg_score}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ResultCard
              label="CO₂ Emissions"
              value={results.annual.co2_tonnes.toFixed(0)}
              unit="t/yr"
              highlight={results.annual.co2_tonnes < 800 ? "good" : "bad"}
            />
            <ResultCard
              label="Energy Used"
              value={results.annual.energy_mwh.toFixed(0)}
              unit="MWh/yr"
              highlight="neutral"
            />
            <ResultCard
              label="Operating Cost"
              value={`$${(results.annual.operating_cost_usd / 1000).toFixed(0)}k`}
              unit="/yr"
              highlight="neutral"
            />
            <ResultCard
              label="Renewable %"
              value={results.scores.renewable_pct.toFixed(0)}
              unit="%"
              highlight={results.scores.renewable_pct >= 50 ? "good" : "neutral"}
            />
          </div>
          {/* Score breakdown */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ESG Breakdown</p>
            {(["environmental", "social", "governance"] as const).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-24 capitalize">{k}</span>
                <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full"
                    style={{ width: `${results.scores[k]}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700 w-8 text-right">
                  {results.scores[k].toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
