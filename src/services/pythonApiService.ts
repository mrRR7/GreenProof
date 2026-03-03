const BASE_URL = "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SensorReadings {
  co2_emissions: number;
  energy_consumption: number;
  water_usage: number;
  waste_generated: number;
}

export interface FacilityReading {
  facility_id: string;
  timestamp: string;
  sensors: SensorReadings;
  status: string;
}

export interface IoTSummary {
  total_co2_kg_per_hour: number;
  total_energy_kwh: number;
  total_water_liters: number;
  total_waste_kg: number;
  active_facilities: number;
  timestamp: string;
}

export interface IoTCurrentResponse {
  facilities: FacilityReading[];
  summary: IoTSummary;
}

export interface ScenarioParams {
  production_volume: number;
  renewable_energy_percent: number;
  efficiency_rating: number;
  waste_recycling_rate: number;
  num_facilities: number;
}

export interface ScenarioHourly {
  co2_kg: number;
  energy_kwh: number;
  water_litres: number;
  waste_kg: number;
  recycled_kg: number;
  operating_cost_usd: number;
}

export interface ScenarioAnnual {
  co2_tonnes: number;
  energy_mwh: number;
  water_megalitres: number;
  waste_tonnes: number;
  operating_cost_usd: number;
}

export interface ScenarioScores {
  esg_score: number;
  environmental: number;
  social: number;
  governance: number;
  renewable_pct: number;
  efficiency_pct: number;
}

export interface SimulationResults {
  hourly: ScenarioHourly;
  annual: ScenarioAnnual;
  scores: ScenarioScores;
  inputs: ScenarioParams;
}

export interface Discrepancy {
  claim_text: string;
  status: "CONSISTENT" | "INCONSISTENT" | "SUSPICIOUS" | "UNVERIFIABLE";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: string;
  confidence: number;
  recommendation: string;
}

export interface DiscrepancyAnalysis {
  overall_assessment: string;
  trust_score: number;
  red_flags_count: number;
  discrepancies: Discrepancy[];
  summary: {
    consistent_count: number;
    inconsistent_count: number;
    suspicious_count: number;
    unverifiable_count: number;
  };
}

export interface SuggestionImpact {
  co2_reduction_kg_per_year: number;
  cost_savings_usd_per_year: number;
  esg_score_improvement: number;
  payback_period_months: number;
}

export interface Suggestion {
  title: string;
  description: string;
  category: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  complexity: "EASY" | "MEDIUM" | "HARD";
  timeline: "QUICK" | "SHORT" | "MEDIUM" | "LONG";
  implementation_steps: string[];
  expected_impact: SuggestionImpact;
  quick_win: boolean;
  metrics_to_track: string[];
}

export interface SuggestionsResponse {
  executive_summary: string;
  total_potential_co2_reduction_tonnes_per_year: number;
  total_potential_cost_savings_usd_per_year: number;
  suggestions: Suggestion[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Backend error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Backend error ${res.status}`);
  return res.json();
}

// ── Public API ─────────────────────────────────────────────────────────────────

export const pythonApi = {
  /** Returns true if the Python backend is reachable. */
  async isHealthy(): Promise<boolean> {
    try {
      const data = await get<{ status: string }>("/health");
      return data.status === "healthy";
    } catch {
      return false;
    }
  },

  /** Get current IoT sensor readings from all facilities. */
  async getIoTCurrent(): Promise<IoTCurrentResponse> {
    return get<IoTCurrentResponse>("/api/iot/current");
  },

  /** Get IoT history for the last N hours. */
  async getIoTHistory(hours: number = 24) {
    return get(`/api/iot/history/${hours}`);
  },

  /** Run a scenario simulation. */
  async runScenario(params: ScenarioParams): Promise<SimulationResults> {
    const data = await post<{ results: SimulationResults }>("/api/simulate/scenario", params);
    return data.results;
  },

  /** Compare baseline vs proposed scenario. */
  async compareScenarios(baseline: ScenarioParams, proposed: ScenarioParams) {
    return post("/api/simulate/compare", { baseline, proposed });
  },

  /** Run Gemini discrepancy analysis on ESG claims vs IoT data. */
  async analyzeDiscrepancies(claims: string[]): Promise<{ analysis: DiscrepancyAnalysis; iot_snapshot: IoTSummary }> {
    return post("/api/compare/claims-vs-reality", { claims });
  },

  /** Generate AI improvement suggestions for current metrics. */
  async generateSuggestions(simulationResults: SimulationResults): Promise<SuggestionsResponse> {
    const data = await post<{ suggestions: SuggestionsResponse }>("/api/suggestions/generate", {
      simulation_results: simulationResults,
    });
    return data.suggestions;
  },
};

// ── ML Integrity types ────────────────────────────────────────────────────────

export interface IntegrityInput {
  Revenue:           number;
  CarbonEmissions:   number;
  EnergyConsumption: number;
  WaterUsage:        number;
  ESG_Environmental: number;
  ESG_Overall:       number;
}

export interface IntegrityResult {
  integrity_score: number;
  is_suspicious:   boolean;
  confidence:      number;
  method:          string;
  explanations:    string[];
  metrics: {
    carbon_intensity:  number;
    energy_intensity:  number;
    water_intensity:   number;
    esg_environmental: number;
    esg_overall:       number;
  };
}

// appended to pythonApi object below — add these manually if needed:
// pythonApi.checkIntegrity(input)
// pythonApi.checkIntegrityFromSimulation(scenarioParams)
