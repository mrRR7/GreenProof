def generate_explanation(company_data, result):
    explanations = []

    carbon_intensity = company_data["CarbonEmissions"] / company_data["Revenue"]
    energy_intensity = company_data["EnergyConsumption"] / company_data["Revenue"]
    water_intensity = company_data["WaterUsage"] / company_data["Revenue"]

    if carbon_intensity > 0.5:
        explanations.append("High carbon intensity relative to revenue.")

    if energy_intensity > 0.7:
        explanations.append("Energy usage appears disproportionate to revenue.")

    if water_intensity > 0.3:
        explanations.append("Water usage intensity is elevated.")

    if result["is_suspicious"]:
        explanations.append("Overall sustainability pattern deviates from industry norms.")

    if not explanations:
        explanations.append("Sustainability metrics are within expected operational ranges.")

    return explanations