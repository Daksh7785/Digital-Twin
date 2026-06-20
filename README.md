# 🌍 AI-Powered Digital Twin of India's Climate System

A self-learning, high-fidelity digital twin of the Indian subcontinental climate system. This system integrates real-time observational data, advanced spatial-temporal AI prediction modeling, and closed-loop data assimilation to continuously simulate and forecast climate events, detect extreme hazards, and run "what-if" scenarios.

## 🔄 The Digital Twin Loop
```
OBSERVATION ➔ DATA INGESTION ➔ CLIMATE STATE ENGINE ➔ AI FORECAST ➔ SCENARIO SIMULATION ➔ ERROR CORRECTION ➔ UPDATED STATE ➔ LOOP
```

## 📦 System Modules
1. **Data Ingestion Engine**: Preprocesses and validates IMD grid data, INSAT/MOSDAC satellite imagery, and ERA5 reanalysis fields.
2. **Climate State Engine**: Maintains the high-resolution grid memory (`STATE(t)`) covering temperature, rainfall, ocean metrics (ENSO, IOD), and soil moisture.
3. **AI Forecast Engine**: Spatial-temporal ensemble models (ConvLSTM, LSTM, and XGBoost) predicting climate variables up to 14 days out with Bayesian uncertainty bounds.
4. **Data Assimilation Loop**: Self-corrects prediction errors using a Kalman Filter correction model, updating the state engine dynamically.
5. **Scenario Simulation Engine**: Modifies key factors (e.g. ±20% rain, ±3°C temp) to simulate local environmental impacts.
6. **Geospatial Dashboard**: Interactive React visualization showing climate variables, alerts, and scenarios.
7. **Extreme Event Detection & Alert System**: Real-time rule-based and predictive classification for floods, droughts, and heatwaves.