import React, { useState } from "react";
import { Lightbulb, Loader2, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { pythonApi, SimulationResults, Suggestion, SuggestionsResponse } from "../services/pythonApiService";

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  HIGH:   "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW:    "bg-slate-100 text-slate-600",
};

const TIMELINE_LABELS: Record<string, string> = {
  QUICK:  "0-30 days",
  SHORT:  "1-3 months",
  MEDIUM: "3-12 months",
  LONG:   "1+ years",
};

function SuggestionCard({ s }: { s: Suggestion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-start justify-between cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {s.quick_win && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                <Zap className="w-3 h-3" /> Quick Win
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[s.priority]}`}>
              {s.priority}
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {s.category}
            </span>
          </div>
          <h4 className="font-semibold text-slate-800 text-sm">{s.title}</h4>
          {/* Impact summary */}
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="text-green-600 font-medium">
              -{(s.expected_impact.co2_reduction_kg_per_year / 1000).toFixed(1)}t CO₂/yr
            </span>
            <span className="text-emerald-600 font-medium">
              ${s.expected_impact.cost_savings_usd_per_year.toLocaleString()}/yr saved
            </span>
            <span className="text-blue-600 font-medium">
              +{s.expected_impact.esg_score_improvement} ESG pts
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
        )}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
          <p className="text-sm text-slate-600">{s.description}</p>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="text-xs text-slate-400">Complexity</div>
              <div className="font-semibold text-sm text-slate-700">{s.complexity}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="text-xs text-slate-400">Timeline</div>
              <div className="font-semibold text-sm text-slate-700">{TIMELINE_LABELS[s.timeline]}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="text-xs text-slate-400">Payback Period</div>
              <div className="font-semibold text-sm text-slate-700">
                {s.expected_impact.payback_period_months} months
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="text-xs text-slate-400">ESG Impact</div>
              <div className="font-semibold text-sm text-blue-600">
                +{s.expected_impact.esg_score_improvement} pts
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Implementation Steps
            </p>
            <ol className="space-y-1">
              {s.implementation_steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-600">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Track metrics */}
          {s.metrics_to_track?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Track These Metrics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {s.metrics_to_track.map((m, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  simulationResults: SimulationResults | null;
}

export function SuggestionPanel({ simulationResults }: Props) {
  const [response, setResponse] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const generate = async () => {
    if (!simulationResults) return;
    setLoading(true);
    setError(null);
    try {
      const res = await pythonApi.generateSuggestions(simulationResults);
      setResponse(res);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + button */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          AI Improvement Suggestions
        </h3>
        <button
          onClick={generate}
          disabled={loading || !simulationResults}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
          ) : (
            <><Lightbulb className="w-3.5 h-3.5" /> Generate</>
          )}
        </button>
      </div>

      {!simulationResults && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500 text-center">
          Run a simulation first to generate AI suggestions.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {response && (
        <>
          {/* Executive summary */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-emerald-800 mb-1">Executive Summary</p>
            <p className="text-sm text-emerald-700">{response.executive_summary}</p>
            <div className="flex gap-6 mt-3 text-sm">
              <div>
                <span className="text-emerald-600 font-bold">
                  {(response.total_potential_co2_reduction_tonnes_per_year).toFixed(0)}t
                </span>
                <span className="text-emerald-500 ml-1">CO₂ reduction potential/yr</span>
              </div>
              <div>
                <span className="text-emerald-600 font-bold">
                  ${response.total_potential_cost_savings_usd_per_year.toLocaleString()}
                </span>
                <span className="text-emerald-500 ml-1">savings potential/yr</span>
              </div>
            </div>
          </div>

          {/* Cards */}
          {response.suggestions.map((s, i) => (
            <SuggestionCard key={i} s={s} />
          ))}
        </>
      )}
    </div>
  );
}
