import joblib

# Load trained model + scaler
model = joblib.load("models/integrity_model.pkl")
scaler = joblib.load("models/scaler.pkl")

def evaluate_company(company_data):
    """
    company_data must contain:
    Revenue
    CarbonEmissions
    EnergyConsumption
    WaterUsage
    ESG_Environmental
    ESG_Overall
    """

    carbon_intensity = company_data["CarbonEmissions"] / company_data["Revenue"]
    energy_intensity = company_data["EnergyConsumption"] / company_data["Revenue"]
    water_intensity = company_data["WaterUsage"] / company_data["Revenue"]

    features = [[
        carbon_intensity,
        energy_intensity,
        water_intensity,
        company_data["ESG_Environmental"],
        company_data["ESG_Overall"]
    ]]

    X_scaled = scaler.transform(features)

    anomaly_score = model.decision_function(X_scaled)[0]
    prediction = model.predict(X_scaled)[0]

    result = {
        "integrity_score": float(anomaly_score),
        "is_suspicious": True if prediction == -1 else False
    }

    return result