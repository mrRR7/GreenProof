import os
import json
import re
from typing import Dict

import google.generativeai as genai


_SYSTEM_PROMPT = """You are a sustainability consultant. Generate ESG improvement recommendations.
Respond with valid JSON only. No markdown, no backticks, no extra text before or after the JSON."""

_SUGGESTION_PROMPT = """
Based on these ESG metrics, generate 4 improvement recommendations.

METRICS:
{metrics}

Return ONLY this JSON structure, nothing else:
{{
  "executive_summary": "2-3 sentence summary",
  "total_potential_co2_reduction_tonnes_per_year": 500,
  "total_potential_cost_savings_usd_per_year": 50000,
  "suggestions": [
    {{
      "title": "Action title",
      "description": "What to do",
      "category": "ENERGY",
      "priority": "HIGH",
      "complexity": "MEDIUM",
      "timeline": "SHORT",
      "implementation_steps": ["step 1", "step 2", "step 3"],
      "expected_impact": {{
        "co2_reduction_kg_per_year": 10000,
        "cost_savings_usd_per_year": 15000,
        "esg_score_improvement": 5,
        "payback_period_months": 18
      }},
      "quick_win": false,
      "metrics_to_track": ["metric1", "metric2"]
    }}
  ]
}}
"""


def _clean_json(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?", "", raw, flags=re.MULTILINE).strip()
    raw = re.sub(r"```$", "", raw, flags=re.MULTILINE).strip()
    start = raw.find("{")
    end   = raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end+1]
    return raw


def generate_suggestions(simulation_results: Dict) -> Dict:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return {
            "error": "GEMINI_API_KEY not set",
            "executive_summary": "API key missing — add GEMINI_API_KEY to your .env.local file.",
            "total_potential_co2_reduction_tonnes_per_year": 0,
            "total_potential_cost_savings_usd_per_year": 0,
            "suggestions": [],
        }

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-3-flash-preview",
        system_instruction=_SYSTEM_PROMPT,
    )

    # Only pass scores and annual figures to keep prompt short
    slim_metrics = {
        "annual":  simulation_results.get("annual", {}),
        "scores":  simulation_results.get("scores", {}),
        "inputs":  simulation_results.get("inputs", {}),
    }
    prompt = _SUGGESTION_PROMPT.format(metrics=json.dumps(slim_metrics, indent=2))

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                max_output_tokens=4096,
            ),
        )
        raw    = _clean_json(response.text)
        result = json.loads(raw)
        return result

    except json.JSONDecodeError as exc:
        return {
            "error": f"JSON parse error: {str(exc)}",
            "executive_summary": "Could not parse AI response.",
            "total_potential_co2_reduction_tonnes_per_year": 0,
            "total_potential_cost_savings_usd_per_year": 0,
            "suggestions": [],
        }
    except Exception as exc:
        return {
            "error": str(exc),
            "executive_summary": f"Suggestion generation failed: {str(exc)}",
            "total_potential_co2_reduction_tonnes_per_year": 0,
            "total_potential_cost_savings_usd_per_year": 0,
            "suggestions": [],
        }
