"""
ml_integrity.py
Wraps the custom Isolation Forest model (integrity_engine.py + explanation_engine.py)
and exposes a clean function the FastAPI backend can call.
"""

import os
import sys
from typing import Dict, List

# ── Try to load the real model. If .pkl files don't exist yet, fall back to a
#    simple rule-based scorer so the server still starts during development. ──

_MODEL_AVAILABLE = False

try:
    import joblib

    _MODEL_PATH   = os.path.join(os.path.dirname(__file__), "models", "integrity_model.pkl")
    _SCALER_PATH  = os.path.join(os.path.dirname(__file__), "models", "scaler.pkl")

    if os.path.exists(_MODEL_PATH) and os.path.exists(_SCALER_PATH):
        _model  = joblib.load(_MODEL_PATH)
        _scaler = joblib.load(_SCALER_PATH)
        _MODEL_AVAILABLE = True
        print("✅ ML integrity model loaded successfully.")
    else:
        print("⚠️  Model .pkl files not found — using rule-based fallback.")
        print("   Run `python train_model.py` to generate the model files.")
except ImportError:
    print("⚠️  joblib not installed — using rule-based fallback.")


# ── Core evaluation ────────────────────────────────────────────────────────────

def evaluate_company(company_data: Dict) -> Dict:
    """
    Runs the ML model (or rule-based fallback) on company ESG data.

    Required keys in company_data:
        Revenue              (float) — annual revenue in $M
        CarbonEmissions      (float) — annual CO2 in tonnes
        EnergyConsumption    (float) — annual energy in MWh
        WaterUsage           (float) — annual water in megalitres
        ESG_Environmental    (float) — environmental score 0-100
        ESG_Overall          (float) — overall ESG score 0-100

    Returns:
        integrity_score  (float)  — anomaly score; lower = more suspicious
        is_suspicious    (bool)   — True if model flags as anomaly
        confidence       (float)  — 0-1 confidence in suspicion flag
        method           (str)    — "ml_model" or "rule_based"
    """
    required = ["Revenue", "CarbonEmissions", "EnergyConsumption",
                "WaterUsage", "ESG_Environmental", "ESG_Overall"]
    for key in required:
        if key not in company_data:
            raise ValueError(f"Missing required field: {key}")

    if _MODEL_AVAILABLE:
        return _evaluate_with_model(company_data)
    else:
        return _evaluate_rule_based(company_data)


def _evaluate_with_model(company_data: Dict) -> Dict:
    """Use the trained Isolation Forest."""
    rev = company_data["Revenue"] or 1  # avoid div-by-zero

    features = [[
        company_data["CarbonEmissions"] / rev,
        company_data["EnergyConsumption"] / rev,
        company_data["WaterUsage"] / rev,
        company_data["ESG_Environmental"],
        company_data["ESG_Overall"],
    ]]

    X_scaled       = _scaler.transform(features)
    anomaly_score  = float(_model.decision_function(X_scaled)[0])
    prediction     = int(_model.predict(X_scaled)[0])
    is_suspicious  = prediction == -1

    # Normalise anomaly score to 0-1 confidence (lower score = more anomalous)
    # Typical range is roughly -0.5 to +0.5; we clamp and invert
    confidence = float(max(0.0, min(1.0, (-anomaly_score + 0.3) / 0.6))) if is_suspicious else 0.0

    return {
        "integrity_score": anomaly_score,
        "is_suspicious":   is_suspicious,
        "confidence":      round(confidence, 3),
        "method":          "ml_model",
    }


def _evaluate_rule_based(company_data: Dict) -> Dict:
    """Simple threshold fallback when model files are absent."""
    rev = company_data["Revenue"] or 1

    carbon_intensity = company_data["CarbonEmissions"] / rev
    energy_intensity = company_data["EnergyConsumption"] / rev
    water_intensity  = company_data["WaterUsage"] / rev

    red_flags = sum([
        carbon_intensity > 0.5,
        energy_intensity > 0.7,
        water_intensity  > 0.3,
        company_data["ESG_Environmental"] < 40,
        company_data["ESG_Overall"]        < 40,
    ])

    is_suspicious  = red_flags >= 2
    # Fake an anomaly score in the same range the real model uses
    integrity_score = -0.1 * red_flags  # 0 flags → 0.0, 5 flags → -0.5

    return {
        "integrity_score": round(integrity_score, 4),
        "is_suspicious":   is_suspicious,
        "confidence":      round(min(1.0, red_flags / 3), 3),
        "method":          "rule_based",
    }


# ── Explanation engine (verbatim from your friend's code) ─────────────────────

def generate_explanation(company_data: Dict, result: Dict) -> List[str]:
    """Returns human-readable reasons for the model's verdict."""
    explanations = []

    rev = company_data["Revenue"] or 1
    carbon_intensity = company_data["CarbonEmissions"] / rev
    energy_intensity = company_data["EnergyConsumption"] / rev
    water_intensity  = company_data["WaterUsage"] / rev

    if carbon_intensity > 0.5:
        explanations.append(
            f"High carbon intensity ({carbon_intensity:.2f} t CO₂ per $M revenue) — "
            "significantly above the 0.5 industry benchmark."
        )

    if energy_intensity > 0.7:
        explanations.append(
            f"Energy usage ({energy_intensity:.2f} MWh per $M revenue) is "
            "disproportionate to revenue."
        )

    if water_intensity > 0.3:
        explanations.append(
            f"Water intensity ({water_intensity:.2f} ML per $M revenue) is elevated."
        )

    if company_data["ESG_Environmental"] < 40:
        explanations.append(
            f"Low environmental score ({company_data['ESG_Environmental']}) "
            "contradicts positive ESG claims."
        )

    if result["is_suspicious"]:
        explanations.append(
            "Overall sustainability pattern deviates significantly from industry norms — "
            "potential greenwashing detected."
        )

    if not explanations:
        explanations.append(
            "Sustainability metrics are within expected operational ranges."
        )

    return explanations


# ── Combined single-call API ───────────────────────────────────────────────────

def run_full_integrity_check(company_data: Dict) -> Dict:
    """
    Runs model + explanation in one call.
    Returns everything the frontend needs.
    """
    result       = evaluate_company(company_data)
    explanations = generate_explanation(company_data, result)

    rev = company_data["Revenue"] or 1

    return {
        **result,
        "explanations": explanations,
        "metrics": {
            "carbon_intensity": round(company_data["CarbonEmissions"] / rev, 4),
            "energy_intensity": round(company_data["EnergyConsumption"] / rev, 4),
            "water_intensity":  round(company_data["WaterUsage"] / rev, 4),
            "esg_environmental": company_data["ESG_Environmental"],
            "esg_overall":       company_data["ESG_Overall"],
        },
    }