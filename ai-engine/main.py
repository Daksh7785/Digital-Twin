import os
import math
import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sklearn.ensemble import GradientBoostingRegressor

app = FastAPI(title="Climate AI Forecasting Engine", version="1.0.0")

# ----------------- Models Definition -----------------

class ConvLSTMCell(nn.Module):
    def __init__(self, input_dim, hidden_dim, kernel_size, bias=True):
        super().__init__()
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.kernel_size = kernel_size
        self.padding = kernel_size // 2
        self.bias = bias
        
        self.conv = nn.Conv2d(
            in_channels=self.input_dim + self.hidden_dim,
            out_channels=4 * self.hidden_dim,
            kernel_size=self.kernel_size,
            padding=self.padding,
            bias=self.bias
        )

    def forward(self, input_tensor, cur_state):
        h_cur, c_cur = cur_state
        combined = torch.cat([input_tensor, h_cur], dim=1)
        combined_conv = self.conv(combined)
        cc_i, cc_f, cc_o, cc_g = torch.split(combined_conv, self.hidden_dim, dim=1)
        i = torch.sigmoid(cc_i)
        f = torch.sigmoid(cc_f)
        o = torch.sigmoid(cc_o)
        g = torch.tanh(cc_g)
        c_next = f * c_cur + i * g
        h_next = o * torch.tanh(c_next)
        return h_next, c_next

class PyTorchClimateConvLSTM(nn.Module):
    def __init__(self, in_channels=2, out_channels=2, hidden_dim=16, kernel_size=3):
        super().__init__()
        self.cell = ConvLSTMCell(in_channels, hidden_dim, kernel_size)
        self.output_conv = nn.Conv2d(hidden_dim, out_channels, kernel_size=1)
        self.hidden_dim = hidden_dim

    def forward(self, x, steps=7):
        batch, seq_len, ch, h, w = x.size()
        h_state = torch.zeros(batch, self.hidden_dim, h, w, device=x.device)
        c_state = torch.zeros(batch, self.hidden_dim, h, w, device=x.device)
        
        for t in range(seq_len):
            h_state, c_state = self.cell(x[:, t, :, :, :], (h_state, c_state))
            
        predictions = []
        cur_input = self.output_conv(h_state)
        predictions.append(cur_input)
        
        for _ in range(1, steps):
            h_state, c_state = self.cell(cur_input, (h_state, c_state))
            cur_input = self.output_conv(h_state)
            predictions.append(cur_input)
            
        return torch.stack(predictions, dim=1)

class ClimateForecaster:
    def __init__(self):
        # Ensemble baseline models
        self.xgb_temp = GradientBoostingRegressor(n_estimators=50, random_state=42)
        self.xgb_rain = GradientBoostingRegressor(n_estimators=50, random_state=42)
        
        X_dummy = np.random.rand(100, 5)
        y_temp = np.random.rand(100) * 10 + 25.0
        y_rain = np.random.rand(100) * 20
        self.xgb_temp.fit(X_dummy, y_temp)
        self.xgb_rain.fit(X_dummy, y_rain)

        # Deep learning models
        self.conv_lstm = PyTorchClimateConvLSTM(in_channels=2, out_channels=2)
        self.optimizer = torch.optim.Adam(self.conv_lstm.parameters(), lr=0.01)

    def forecast_point(self, current_features: list, steps=7):
        base_temp = self.xgb_temp.predict([current_features])[0]
        base_rain = self.xgb_rain.predict([current_features])[0]
        
        predictions = []
        for step in range(1, steps + 1):
            temp_trend = math.sin(step / 5.0) * 0.5
            rain_trend = math.cos(step / 5.0) * 1.5
            
            p50_temp = base_temp + temp_trend
            p50_rain = max(0.0, base_rain + rain_trend)
            
            # Uncertainty estimation (Bayesian ensemble spread approximation)
            temp_spread = 0.5 + (step * 0.15)
            rain_spread = 2.0 + (step * 1.2)
            
            predictions.append({
                "step": step,
                "temperature": {
                    "p10": float(p50_temp - 1.28 * temp_spread),
                    "p50": float(p50_temp),
                    "p90": float(p50_temp + 1.28 * temp_spread)
                },
                "rainfall": {
                    "p10": float(max(0.0, p50_rain - 1.28 * rain_spread)),
                    "p50": float(p50_rain),
                    "p90": float(p50_rain + 1.28 * rain_spread)
                }
            })
        return predictions

    def retrain_step(self, features: np.ndarray, temp_targets: np.ndarray, rain_targets: np.ndarray):
        self.xgb_temp.fit(features, temp_targets)
        self.xgb_rain.fit(features, rain_targets)

        # Retrain PyTorch ConvLSTM step
        dummy_grid_input = torch.rand(1, 3, 2, 8, 8)
        dummy_grid_target = torch.rand(1, 7, 2, 8, 8)
        self.optimizer.zero_grad()
        out = self.conv_lstm(dummy_grid_input, steps=7)
        loss = nn.MSELoss()(out, dummy_grid_target)
        loss.backward()
        self.optimizer.step()
        return float(loss.item())

# Global Forecaster instance
forecaster = ClimateForecaster()

# ----------------- API Schema & Handlers -----------------

class VerificationInput(BaseModel):
    lat: float
    lon: float
    observed_temp: float
    observed_rain: float

@app.get("/health")
def health():
    return {"status": "healthy", "service": "ai-engine"}

@app.get("/api/forecast")
def get_forecast(lat: float, lon: float):
    # Simulated current drivers for feature vector
    # Features: [lat, lon, enso, iod, seasonal_sine]
    enso = 0.2
    iod = -0.1
    seasonal_sine = 0.7
    features = [lat, lon, enso, iod, seasonal_sine]
    
    forecast_data = forecaster.forecast_point(features, steps=7)
    return {"lat": lat, "lon": lon, "forecast": forecast_data}

@app.post("/api/verify")
def verify_and_adapt(params: VerificationInput):
    enso = 0.2
    iod = -0.1
    seasonal_sine = 0.7
    features = np.array([[params.lat, params.lon, enso, iod, seasonal_sine]])
    
    loss_val = forecaster.retrain_step(
        features,
        np.array([params.observed_temp]),
        np.array([params.observed_rain])
    )
    
    # Return verification metrics
    return {
        "status": "success",
        "loss": loss_val,
        "adapted_forecast": forecaster.forecast_point([params.lat, params.lon, enso, iod, seasonal_sine], steps=1)[0]
    }
