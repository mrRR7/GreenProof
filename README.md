# GreenProof

GreenProof is an open-source ESG verification platform that cross-checks corporate sustainability disclosures against real operational data. It combines rule-based NLP claim extraction, real-time IoT sensor comparison, machine learning anomaly detection, and AI-powered analysis to identify inconsistencies in ESG reports automatically.

Built at Geminathon 2026, a 24-hour hackathon organized by the Code Y Gen Club at VIT Chennai, with support from Google Gemini, ElevenLabs, Major League Hacking, and YSOC.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [ML Model](#ml-model)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## Overview

Most ESG scoring tools take company disclosures at face value. GreenProof verifies them by running a multi-stage pipeline:

1. **Claim Extraction** — A rule-based NLP parser extracts ESG claims from uploaded PDF reports and classifies them as quantitative, future target, comparative, or general. Mathematical consistency checks are applied where possible.
2. **IoT Cross-Verification** — Extracted claims are compared against live facility-level sensor data (CO2 emissions, energy consumption, water usage, waste generation) streamed in real time via WebSocket.
3. **Anomaly Detection** — A custom Isolation Forest model evaluates company metrics against industry norms and flags statistically anomalous patterns that may indicate greenwashing.
4. **AI Analysis** — Gemini 1.5 Flash performs structured discrepancy analysis between report claims and IoT data, assigning severity levels and confidence scores to each inconsistency.
5. **Industry Simulation** — A physics-based simulation engine lets users model operational changes and see their precise impact on ESG scores, emissions, and costs before implementation.
6. **Suggestion Generation** — Gemini generates prioritised improvement recommendations with estimated CO2 reduction, cost savings, and payback periods.
7. **Audit Trail** — Every verification run is stored in a SHA-256 hash chain, making historical records tamper-evident.

---

## Tech Stack

**Frontend**
- React 19, TypeScript, Vite
- Tailwind CSS v4
- Motion
- Lucide React
- pdfjs-dist
- React Dropzone

**Node Backend**
- Express.js
- Better-SQLite3
- Node.js crypto module

**Python Backend**
- FastAPI, Uvicorn
- scikit-learn
- joblib
- pandas, numpy
- google-generativeai
- python-dotenv
- websockets

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Python 3.11 or higher
- A Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/greenproof.git
cd greenproof
```

**2. Configure environment variables**

Create a `.env.local` file in the project root:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

**3. Install frontend dependencies**

```bash
npm install
```

**4. Install Python dependencies**

```bash
cd backend
pip install -r requirements.txt
```

**5. Train the ML model**

Place the ESG dataset at `backend/data/esg_data.csv.csv`, then run:

```bash
cd backend
python train_model.py
```

This generates `backend/models/integrity_model.pkl` and `backend/models/scaler.pkl`. This step is only required once. If the model files are absent, the system falls back to a rule-based integrity checker automatically.

**6. Start the Python backend**

```bash
cd backend
python main.py
# Listening at http://localhost:8000
```

**7. Start the frontend**

In a separate terminal:

```bash
npm run dev
# Listening at http://localhost:3000
```

---

## Project Structure

```
greenproof/
├── src/
│   ├── components/
│   │   ├── FileUpload.tsx
│   │   ├── ClaimCard.tsx
│   │   ├── VerificationLog.tsx
│   │   ├── IoTDashboard.tsx
│   │   ├── SimulationControls.tsx
│   │   ├── SuggestionPanel.tsx
│   │   ├── DiscrepancyAnalysis.tsx
│   │   └── IntegrityChecker.tsx
│   ├── services/
│   │   ├── geminiService.ts
│   │   └── pythonApiService.ts
│   ├── lib/
│   │   ├── pdfExtractor.ts
│   │   └── utils.ts
│   ├── types.ts
│   └── App.tsx
├── backend/
│   ├── main.py
│   ├── iot_simulator.py
│   ├── simulator.py
│   ├── ai_analyzer.py
│   ├── suggestion_engine.py
│   ├── ml_integrity.py
│   ├── integrity_engine.py
│   ├── explanation_engine.py
│   ├── train_model.py
│   ├── models/               # Generated .pkl files (gitignored)
│   ├── data/                 # Training data (gitignored)
│   └── requirements.txt
├── server.ts
├── index.html
├── package.json
├── vite.config.ts
└── .env.local                # API keys (gitignored)
```

---

## API Reference

Interactive documentation is available at `http://localhost:8000/docs` when the backend is running.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check and model status |
| GET | `/api/iot/current` | Current sensor readings across all facilities |
| GET | `/api/iot/history/{hours}` | Historical sensor data |
| WS | `/api/iot/stream` | Real-time WebSocket data stream |
| POST | `/api/simulate/scenario` | Run an industry simulation scenario |
| POST | `/api/simulate/compare` | Compare two simulation scenarios |
| POST | `/api/compare/claims-vs-reality` | Gemini discrepancy analysis |
| POST | `/api/suggestions/generate` | Gemini improvement suggestions |
| POST | `/api/integrity/check` | ML anomaly detection on company data |
| POST | `/api/integrity/check-from-simulation` | Simulation piped into ML model |
| POST | `/api/analyze/full` | Full end-to-end pipeline in one call |

---

## ML Model

The integrity checker uses a scikit-learn Isolation Forest trained on the following ESG signals:

| Feature | Description |
|---------|-------------|
| carbon_intensity | CO2 emissions divided by revenue ($M) |
| energy_intensity | Energy consumption divided by revenue ($M) |
| water_intensity | Water usage divided by revenue ($M) |
| ESG_Environmental | Environmental score (0-100) |
| ESG_Overall | Overall ESG score (0-100) |

Configuration: `n_estimators=100`, `contamination=0.07`, `random_state=42`. Features are normalised using StandardScaler prior to training and inference.

At inference the model returns an anomaly score, a binary suspicious flag, and a set of human-readable explanations identifying which intensity ratios triggered the flag.

---

## Roadmap

- Vision-based parsing for charts and infographics in PDF reports
- Historical ESG trend tracking per company
- PostgreSQL migration
- User authentication
- Fine-tuning Mistral 7B for ESG claim classification to remove third-party AI dependency
- Real IoT device integration via MQTT
- Multi-company comparison dashboard
- PDF export for verification reports

---

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request to discuss the proposed change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request

---

## Acknowledgements

Developed at Geminathon 2026, organized by the Code Y Gen Club at VIT Chennai. Supported by Google Gemini, ElevenLabs, Major League Hacking, and YSOC.


