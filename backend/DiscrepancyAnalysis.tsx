import React, { useState } from "react";
import { ShieldAlert, Loader2, CheckCircle, XCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { pythonApi, DiscrepancyAnalysis as AnalysisResult, Discrepancy } from "@/src/services/pythonApiService";

// ── Config maps ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  CONSISTENT:    { icon: CheckCircle,   color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Consistent" },
  INCONSISTENT:  { icon: XCircle,       color: "text-red-600",     bg: "bg-red-50 border-red-200",         label: "Inconsistent" },
  SUSPICIOUS:    { icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     label: "Suspicious" },
  UNVERIFIABLE:  { icon: HelpCircle,    color: "text-slate-500",   bg: "bg-slate-50 border-slate-200",     label: "Unverifiable" },
};

const SEVERITY_STYLES: Record<string, string> = {
  LOW:      "bg-slate-100 text-slate-600",
  MEDIUM:   "bg-amber-100 text-amber-700",
  HIGH:     "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700 font-bold",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function DiscrepancyCard({ d }: { d: Discrepancy }) {
  const cfg = STATUS_CONFIG[d.status] ?? STATUS_CONFIG.UNVERIFIABLE;
  const Icon = cfg.icon;
  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.color}`} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color} bg-white border`}>
              {cfg.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${SEVERITY_STYLES[d.severity]}`}>
              {d.severity}
            </span>
            <span className="text-xs text-slate-400 ml-auto">
              Confidence: {Math.round(d.confidence * 100)}%
            </span>
          </div>

          <p className="text-sm font-medium text-slate-800 italic">"{d.claim_text}"</p>

          <div className="bg-white/60 rounded-lg p-2.5 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Evidence: </span>
            {d.evidence}
          </div>

          {d.recommendation && (
            <div className="text-xs text-slate-500">
              <span className="font-semibold">Recommendation: </span>
              {d.recommendation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrustMeter({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500"
              : score >= 50 ? "bg-amber-500"
              : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-semibold text-slate-700">Trust Score</span>
        <span className="font-bold text-slate-800">{score}/100</span>
      </div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  claims: string[];
}

export function DiscrepancyAnalysis({ claims }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const run = async () => {
    if (!claims.length) return;
    setLoading(true);
    setError(null);
    try {
      const res = await pythonApi.analyzeDiscrepancies(claims);
      setAnalysis(res.analysis);
    } catch (e: any) {
      setError(e.message ?? "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + button */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          Claims vs IoT Reality
        </h3>
        <button
          onClick={run}
          disabled={loading || claims.length === 0}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…</>
          ) : (
            <><ShieldAlert className="w-3.5 h-3.5" /> Analyze</>
          )}
        </button>
      </div>

      {claims.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-500 text-center">
          Upload an ESG report first to extract claims for analysis.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {analysis && (
        <>
          {/* Overview */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <TrustMeter score={analysis.trust_score} />

            <p className="text-sm text-slate-600">{analysis.overall_assessment}</p>

            {/* Counts */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {(["consistent", "inconsistent", "suspicious", "unverifiable"] as const).map((k) => {
                const count = analysis.summary[`${k}_count` as keyof typeof analysis.summary];
                const cfg = STATUS_CONFIG[k.toUpperCase() as keyof typeof STATUS_CONFIG];
                const Icon = cfg?.icon ?? HelpCircle;
                return (
                  <div key={k} className="text-center">
                    <Icon className={`w-4 h-4 mx-auto mb-0.5 ${cfg?.color ?? "text-slate-400"}`} />
                    <div className="text-lg font-bold text-slate-800">{count}</div>
                    <div className="text-xs text-slate-400 capitalize">{k}</div>
                  </div>
                );
              })}
            </div>

            {analysis.red_flags_count > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 font-medium">
                🚩 {analysis.red_flags_count} red flag{analysis.red_flags_count > 1 ? "s" : ""} detected — potential greenwashing
              </div>
            )}
          </div>

          {/* Discrepancy cards */}
          {analysis.discrepancies.map((d, i) => (
            <DiscrepancyCard key={i} d={d} />
          ))}
        </>
      )}
    </div>
  );
}
