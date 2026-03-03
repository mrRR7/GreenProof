import os
import asyncio
import json
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from iot_simulator import get_current_readings, get_history, get_summary_stats
from simulator import run_scenario, compare_scenarios
from ai_analyzer import analyze_discrepancies
from suggestion_engine import generate_suggestions
from ml_integrity import run_full_integrity_check, _MODEL_AVAILABLE

# ── Load env ───────────────────────────────────────────────────────────────────
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env.local"))

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="ESG Verify AI Backend", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic models ────────────────────────────────────────────────────────────

class ScenarioRequest(BaseModel):
    production_volume: float = 100.0
    renewable_energy_percent: float = 30.0
    efficiency_rating: float = 0.85
    waste_recycling_rate: float = 0.30
    num_facilities: int = 1


class CompareRequest(BaseModel):
    baseline: ScenarioRequest
    proposed: ScenarioRequest


class DiscrepancyRequest(BaseModel):
    claims: List[str]


class SuggestionRequest(BaseModel):
    simulation_results: dict


class ComprehensiveRequest(BaseModel):
    claims: List[str]
    scenario: ScenarioRequest


class IntegrityRequest(BaseModel):
    """
    Input for the custom ML anomaly detection model.
    All numeric values — use realistic scale:
      Revenue           in $M  (e.g. 500.0)
      CarbonEmissions   in tonnes/year  (e.g. 12000)
      EnergyConsumption in MWh/year     (e.g. 8500)
      WaterUsage        in megalitres/year (e.g. 4.2)
      ESG_Environmental score 0-100
      ESG_Overall       score 0-100
    """
    Revenue:           float
    CarbonEmissions:   float
    EnergyConsumption: float
    WaterUsage:        float
    ESG_Environmental: float
    ESG_Overall:       float


class FullAnalysisRequest(BaseModel):
    """
    Combined: ML integrity check + Gemini discrepancy + simulation in one call.
    """
    company: IntegrityRequest
    claims:  List[str]
    scenario: ScenarioRequest


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "name":    "ESG Verify AI Backend",
        "version": "1.1.0",
        "status":  "running",
        "ml_model_loaded": _MODEL_AVAILABLE,
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "services": {
            "iot":       "ok",
            "simulator": "ok",
            "gemini":    "configured",
            "ml_model":  "loaded" if _MODEL_AVAILABLE else "fallback (run train_model.py)",
        },
    }


# ── IoT endpoints ──────────────────────────────────────────────────────────────

@app.get("/api/iot/current")
def iot_current():
    facilities = get_current_readings()
    summary    = get_summary_stats()
    return {"facilities": facilities, "summary": summary}


@app.get("/api/iot/history/{hours}")
def iot_history(hours: int = 24):
    return {"history": get_history(hours), "hours_requested": hours}


@app.websocket("/api/iot/stream")
async def iot_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = {"facilities": get_current_readings(), "summary": get_summary_stats()}
            await websocket.send_text(json.dumps(data))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass


# ── Simulation endpoints ───────────────────────────────────────────────────────

@app.post("/api/simulate/scenario")
def simulate_scenario(req: ScenarioRequest):
    results = run_scenario(
        production_volume=req.production_volume,
        renewable_energy_percent=req.renewable_energy_percent,
        efficiency_rating=req.efficiency_rating,
        waste_recycling_rate=req.waste_recycling_rate,
        num_facilities=req.num_facilities,
    )
    return {"results": results}


@app.post("/api/simulate/compare")
def simulate_compare(req: CompareRequest):
    baseline_result = run_scenario(**req.baseline.dict())
    proposed_result = run_scenario(**req.proposed.dict())
    comparison = compare_scenarios(baseline_result, proposed_result)
    return {"comparison": comparison}


# ── Gemini AI endpoints ────────────────────────────────────────────────────────

@app.post("/api/compare/claims-vs-reality")
def claims_vs_reality(req: DiscrepancyRequest):
    iot_summary = get_summary_stats()
    analysis    = analyze_discrepancies(req.claims, iot_summary)
    return {"analysis": analysis, "iot_snapshot": iot_summary}


@app.post("/api/suggestions/generate")
def suggestions_generate(req: SuggestionRequest):
    suggestions = generate_suggestions(req.simulation_results)
    return {"suggestions": suggestions}


# ── ML Integrity endpoints (custom model) ─────────────────────────────────────

@app.post("/api/integrity/check")
def integrity_check(req: IntegrityRequest):
    """
    Run the custom Isolation Forest model on company ESG data.
    Returns: integrity_score, is_suspicious, confidence, explanations.
    """
    company_data = req.dict()
    result = run_full_integrity_check(company_data)
    return {
        "result": result,
        "model_used": "ml_model" if _MODEL_AVAILABLE else "rule_based_fallback",
    }


@app.post("/api/integrity/check-from-simulation")
def integrity_check_from_simulation(req: ScenarioRequest):
    """
    Convenience endpoint: run a scenario simulation then auto-feed
    the results into the ML integrity model.
    Uses IoT summary data to fill in the company fields.
    """
    sim = run_scenario(
        production_volume=req.production_volume,
        renewable_energy_percent=req.renewable_energy_percent,
        efficiency_rating=req.efficiency_rating,
        waste_recycling_rate=req.waste_recycling_rate,
        num_facilities=req.num_facilities,
    )
    iot = get_summary_stats()

    # Map simulation outputs → ML model inputs
    # Revenue is estimated from production volume (proxy: $1000 per unit/hr annually)
    estimated_revenue = req.production_volume * 1000 * req.num_facilities

    company_data = {
        "Revenue":           estimated_revenue,
        "CarbonEmissions":   sim["annual"]["co2_tonnes"],
        "EnergyConsumption": sim["annual"]["energy_mwh"],
        "WaterUsage":        sim["annual"]["water_megalitres"],
        "ESG_Environmental": sim["scores"]["environmental"],
        "ESG_Overall":       sim["scores"]["esg_score"],
    }

    integrity_result = run_full_integrity_check(company_data)

    return {
        "simulation":  sim,
        "integrity":   integrity_result,
        "model_used":  "ml_model" if _MODEL_AVAILABLE else "rule_based_fallback",
    }


# ── Combined full analysis ─────────────────────────────────────────────────────

@app.post("/api/analyze/comprehensive")
def comprehensive_analysis(req: ComprehensiveRequest):
    """Full pipeline: simulation + Gemini discrepancy + Gemini suggestions."""
    scenario_results = run_scenario(**req.scenario.dict())
    iot_summary      = get_summary_stats()
    discrepancies    = analyze_discrepancies(req.claims, iot_summary)
    suggestions      = generate_suggestions(scenario_results)
    return {
        "simulation":    scenario_results,
        "discrepancies": discrepancies,
        "suggestions":   suggestions,
        "iot_snapshot":  iot_summary,
    }


@app.post("/api/analyze/full")
def full_analysis(req: FullAnalysisRequest):
    """
    The ultimate single endpoint:
    ML integrity check + IoT discrepancy (Gemini) + simulation + suggestions.
    """
    # 1. ML integrity check
    company_data     = req.company.dict()
    integrity_result = run_full_integrity_check(company_data)

    # 2. Simulation
    scenario_results = run_scenario(**req.scenario.dict())

    # 3. Gemini discrepancy (claims vs IoT)
    iot_summary   = get_summary_stats()
    discrepancies = analyze_discrepancies(req.claims, iot_summary)

    # 4. Gemini suggestions
    suggestions = generate_suggestions(scenario_results)

    return {
        "integrity":     integrity_result,
        "simulation":    scenario_results,
        "discrepancies": discrepancies,
        "suggestions":   suggestions,
        "iot_snapshot":  iot_summary,
        "model_used":    "ml_model" if _MODEL_AVAILABLE else "rule_based_fallback",
    }


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
