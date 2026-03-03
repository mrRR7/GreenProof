from typing import Dict, Optional

# Carbon intensity of grid electricity (kg CO2 per kWh)
GRID_CARBON_INTENSITY = 0.42

# Energy required per unit of production (kWh)
ENERGY_PER_UNIT = 8.5

# Water required per unit (litres)
WATER_PER_UNIT = 45.0

# Waste generated per unit (kg)
WASTE_PER_UNIT = 1.8

# Electricity cost per kWh ($)
ELECTRICITY_COST_PER_KWH = 0.12

# Renewable energy cost premium (multiplier)
RENEWABLE_PREMIUM = 1.15

# Water cost per litre ($)
WATER_COST_PER_LITRE = 0.003

# Waste disposal cost per kg ($)
WASTE_DISPOSAL_COST_PER_KG = 0.45


def run_scenario(
    production_volume: float,          # units / hour
    renewable_energy_percent: float,   # 0-100
    efficiency_rating: float,          # 0-1  (1 = perfect)
    waste_recycling_rate: float = 0.3, # 0-1
    num_facilities: int = 1,
    hours_per_year: int = 8760,
) -> Dict:
    """
    Calculate ESG metrics for a given operating scenario.
    Returns hourly and annual figures.
    """
    renewable_fraction = renewable_energy_percent / 100.0
    effective_energy_per_unit = ENERGY_PER_UNIT / max(efficiency_rating, 0.01)

    # ── Energy (kWh/hr) ──────────────────────────────────────────────────────
    energy_per_hour = production_volume * effective_energy_per_unit * num_facilities

    # ── CO2 emissions (kg/hr) ─────────────────────────────────────────────────
    # Renewable energy produces ~0.02 kg CO2/kWh (lifecycle); grid = GRID_CARBON_INTENSITY
    effective_carbon_intensity = (
        renewable_fraction * 0.02 + (1 - renewable_fraction) * GRID_CARBON_INTENSITY
    )
    co2_per_hour = energy_per_hour * effective_carbon_intensity

    # ── Water (litres/hr) ────────────────────────────────────────────────────
    water_per_hour = production_volume * WATER_PER_UNIT * num_facilities / efficiency_rating

    # ── Waste (kg/hr) ────────────────────────────────────────────────────────
    waste_per_hour = production_volume * WASTE_PER_UNIT * num_facilities
    recycled_per_hour = waste_per_hour * waste_recycling_rate
    landfill_per_hour = waste_per_hour - recycled_per_hour

    # ── Operating costs ($/hr) ────────────────────────────────────────────────
    energy_cost_rate = ELECTRICITY_COST_PER_KWH * (
        1 + renewable_fraction * (RENEWABLE_PREMIUM - 1)
    )
    energy_cost = energy_per_hour * energy_cost_rate
    water_cost  = water_per_hour * WATER_COST_PER_LITRE
    waste_cost  = landfill_per_hour * WASTE_DISPOSAL_COST_PER_KG
    total_cost_per_hour = energy_cost + water_cost + waste_cost

    # ── ESG Score (0-100) ─────────────────────────────────────────────────────
    # Environmental sub-score
    e_score = min(100, max(0,
        100
        - (co2_per_hour / 5)       # penalise high CO2
        + (renewable_fraction * 20) # reward renewables
        + (efficiency_rating * 10)  # reward efficiency
    ))
    # Social sub-score (proxy for safety/community investment — fixed in simulation)
    s_score = 70.0
    # Governance sub-score (fixed)
    g_score = 72.0
    esg_score = round((e_score * 0.5 + s_score * 0.25 + g_score * 0.25), 1)

    return {
        "hourly": {
            "co2_kg":           round(co2_per_hour, 2),
            "energy_kwh":       round(energy_per_hour, 2),
            "water_litres":     round(water_per_hour, 2),
            "waste_kg":         round(waste_per_hour, 2),
            "recycled_kg":      round(recycled_per_hour, 2),
            "operating_cost_usd": round(total_cost_per_hour, 2),
        },
        "annual": {
            "co2_tonnes":       round(co2_per_hour * hours_per_year / 1000, 1),
            "energy_mwh":       round(energy_per_hour * hours_per_year / 1000, 1),
            "water_megalitres": round(water_per_hour * hours_per_year / 1_000_000, 2),
            "waste_tonnes":     round(waste_per_hour * hours_per_year / 1000, 1),
            "operating_cost_usd": round(total_cost_per_hour * hours_per_year, 0),
        },
        "scores": {
            "esg_score":        esg_score,
            "environmental":    round(e_score, 1),
            "social":           s_score,
            "governance":       g_score,
            "renewable_pct":    renewable_energy_percent,
            "efficiency_pct":   round(efficiency_rating * 100, 1),
        },
        "inputs": {
            "production_volume":       production_volume,
            "renewable_energy_percent": renewable_energy_percent,
            "efficiency_rating":        efficiency_rating,
            "waste_recycling_rate":     waste_recycling_rate,
            "num_facilities":           num_facilities,
        },
    }


def compare_scenarios(baseline: Dict, proposed: Dict) -> Dict:
    """Return the delta between two scenario result dicts."""
    def pct_change(old, new):
        if old == 0:
            return 0.0
        return round((new - old) / old * 100, 1)

    b_annual = baseline["annual"]
    p_annual = proposed["annual"]

    return {
        "co2_change_pct":    pct_change(b_annual["co2_tonnes"],    p_annual["co2_tonnes"]),
        "energy_change_pct": pct_change(b_annual["energy_mwh"],    p_annual["energy_mwh"]),
        "water_change_pct":  pct_change(b_annual["water_megalitres"], p_annual["water_megalitres"]),
        "cost_change_pct":   pct_change(b_annual["operating_cost_usd"], p_annual["operating_cost_usd"]),
        "esg_score_change":  round(proposed["scores"]["esg_score"] - baseline["scores"]["esg_score"], 1),
        "co2_saved_tonnes":  round(b_annual["co2_tonnes"] - p_annual["co2_tonnes"], 1),
        "cost_saved_usd":    round(b_annual["operating_cost_usd"] - p_annual["operating_cost_usd"], 0),
        "baseline":          baseline,
        "proposed":          proposed,
    }
