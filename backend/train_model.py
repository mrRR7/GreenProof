import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os

print("Loading dataset...")

df = pd.read_csv("data/esg_data.csv.csv")

# Feature engineering (integrity signals)
df["carbon_intensity"] = df["CarbonEmissions"] / df["Revenue"]
df["energy_intensity"] = df["EnergyConsumption"] / df["Revenue"]
df["water_intensity"] = df["WaterUsage"] / df["Revenue"]

features = [
    "carbon_intensity",
    "energy_intensity",
    "water_intensity",
    "ESG_Environmental",
    "ESG_Overall"
]

df = df[features].dropna()

print("Scaling data...")

scaler = StandardScaler()
X_scaled = scaler.fit_transform(df)

print("Training anomaly detection model...")

model = IsolationForest(
    n_estimators=100,
    contamination=0.07,
    random_state=42
)

model.fit(X_scaled)

os.makedirs("models", exist_ok=True)

joblib.dump(model, "models/integrity_model.pkl")
joblib.dump(scaler, "models/scaler.pkl")

print("Model trained and saved successfully.")