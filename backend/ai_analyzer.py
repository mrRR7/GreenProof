import os
import json
import re
from typing import List, Dict

import google.generativeai as genai


_SYSTEM_PROMPT = """You are an expert ESG auditor. Compare ESG claims against IoT sensor data.
Respond with valid JSON only. No markdown, no backticks, no extra text before or after the JSON."""

_ANALYSIS_PROMPT = """
Compare these ESG claims against the IoT sensor data and return a JSON analysis.

ESG CLAIMS:
{claims}

IOT SENSOR DATA:
{iot_data}

Return ONLY this JSON structure, nothing else:
{{
  "overall_assessment": "brief summary",
  "trust_score": 75,
  "red_flags_count": 1,
  "discrepancies": [
    {{
      "claim_text": "the claim",
      "status": "CONSISTENT",
      "severity": "LOW",
      "evidence": "explanation",
      "confidence": 0.8,
      "recommendation": "action to take"
    }}
  ],
  "summary": {{
    "consistent_count": 1,
    "inconsistent_count": 0,
    "suspicious_count": 0,
    "unverifiable_count": 0
  }}
}}
"""


def _clean_json(raw: str) -> str:
    """Aggressively strip everything around the JSON object."""
    raw = raw.strip()

    # Remove markdown code fences
    raw = re.sub(r"^```(?:json)?", "", raw, flags=re.MULTILINE).strip()
    raw = re.sub(r"```$", "", raw, flags=re.MULTILINE).strip()

    # Find the first { and last } and extract just that
    start = raw.find("{")
    end   = raw.rfind("}")
    if start != -1 and end != -1:
        raw = raw[start:end+1]

    return raw


def analyze_discrepancies(claims: List[str], iot_summary: Dict) -> Dict:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return {
            "error": "GEMINI_API_KEY not set",
            "overall_assessment": "API key missing — add GEMINI_API_KEY to your .env.local file.",
            "trust_score": 0,
            "red_flags_count": 0,
            "discrepancies": [],
            "summary": {"consistent_count": 0, "inconsistent_count": 0,
                        "suspicious_count": 0, "unverifiable_count": 0},
        }

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-3-flash-preview",
        system_instruction=_SYSTEM_PROMPT,
    )

    # Limit claims to avoid token overflow causing truncated JSON
    claims_subset = claims[:10]
    claims_text   = "\n".join(f"- {c}" for c in claims_subset)
    iot_text      = json.dumps(iot_summary, indent=2)
    prompt        = _ANALYSIS_PROMPT.format(claims=claims_text, iot_data=iot_text)

    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=4096,
            ),
        )
        raw     = _clean_json(response.text)
        result  = json.loads(raw)
        return result

    except json.JSONDecodeError as exc:
        # Last resort: return a safe fallback with the raw text for debugging
        return {
            "error": f"JSON parse error: {str(exc)}",
            "overall_assessment": "Could not parse AI response. The model returned malformed JSON.",
            "trust_score": 0,
            "red_flags_count": 0,
            "discrepancies": [],
            "summary": {"consistent_count": 0, "inconsistent_count": 0,
                        "suspicious_count": 0, "unverifiable_count": 0},
        }
    except Exception as exc:
        return {
            "error": str(exc),
            "overall_assessment": f"Analysis failed: {str(exc)}",
            "trust_score": 0,
            "red_flags_count": 0,
            "discrepancies": [],
            "summary": {"consistent_count": 0, "inconsistent_count": 0,
                        "suspicious_count": 0, "unverifiable_count": 0},
        }
