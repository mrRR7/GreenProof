import random
import math
from datetime import datetime, timedelta
from typing import List, Dict

FACILITIES = ["facility_alpha", "facility_beta", "facility_gamma"]

BASE_VALUES = {
    "facility_alpha": {"co2": 450, "energy": 2800, "water": 15000, "waste": 320},
    "facility_beta":  {"co2": 380, "energy": 2200, "water": 12000, "waste": 260},
    "facility_gamma": {"co2": 520, "energy": 3100, "water": 18000, "waste": 410},
}


def _noise(value: float, pct: float = 0.05) -> float:
    return value * (1 + random.uniform(-pct, pct))


def _trend(base: float, hour_offset: int) -> float:
    """Simulate daily production cycle — higher during work hours."""
    hour = (datetime.utcnow().hour + hour_offset) % 24
    factor = 0.7 + 0.6 * math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else 0.7
    return base * max(factor, 0.5)


def get_current_readings() -> List[Dict]:
    readings = []
    for fid in FACILITIES:
        base = BASE_VALUES[fid]
        readings.append({
            "facility_id": fid,
            "timestamp": datetime.utcnow().isoformat(),
            "sensors": {
                "co2_emissions":     round(_noise(_trend(base["co2"],   0)), 2),
                "energy_consumption": round(_noise(_trend(base["energy"], 0)), 2),
                "water_usage":        round(_noise(_trend(base["water"],  0)), 2),
                "waste_generated":    round(_noise(_trend(base["waste"],  0)), 2),
            },
            "status": "online",
        })
    return readings


def get_history(hours: int = 24) -> List[Dict]:
    history = []
    now = datetime.utcnow()
    for h in range(hours, 0, -1):
        ts = now - timedelta(hours=h)
        for fid in FACILITIES:
            base = BASE_VALUES[fid]
            history.append({
                "facility_id": fid,
                "timestamp": ts.isoformat(),
                "sensors": {
                    "co2_emissions":      round(_noise(_trend(base["co2"],   -h)), 2),
                    "energy_consumption": round(_noise(_trend(base["energy"], -h)), 2),
                    "water_usage":        round(_noise(_trend(base["water"],  -h)), 2),
                    "waste_generated":    round(_noise(_trend(base["waste"],  -h)), 2),
                },
            })
    return history


def get_summary_stats() -> Dict:
    readings = get_current_readings()
    total_co2    = sum(r["sensors"]["co2_emissions"]     for r in readings)
    total_energy = sum(r["sensors"]["energy_consumption"] for r in readings)
    total_water  = sum(r["sensors"]["water_usage"]        for r in readings)
    total_waste  = sum(r["sensors"]["waste_generated"]    for r in readings)
    return {
        "total_co2_kg_per_hour":    round(total_co2,    2),
        "total_energy_kwh":         round(total_energy, 2),
        "total_water_liters":       round(total_water,  2),
        "total_waste_kg":           round(total_waste,  2),
        "active_facilities":        len(FACILITIES),
        "timestamp":                datetime.utcnow().isoformat(),
    }
