# 🏛 System Architecture Design

## Monorepo Microservices Topology
The Global Climate Digital Twin System is structured as a scalable, high-performance monorepo composed of independent, specialized services:

```
[ FRONTEND ] ➔ [ API GATEWAY ] ➔ [ REDIS CACHE ]
                      │
     ┌────────────────┼────────────────┐
     ▼                ▼                ▼
[ GIS ENGINE ]   [ AI ENGINE ]   [ GRAPH ENGINE ]
     │
     ▼
[ DATA PIPELINE ]
```

### Services Breakdown:
1. **API Gateway (`/backend`)**: Central REST & WebSocket routing hub. Connects the frontend to core services with caching overlays.
2. **Data Ingestion (`/data-pipeline`)**: Ingests multi-source grids (IMD, NASA GPM, INSAT, ERA5) and runs QA validation.
3. **GIS Engine (`/gis-engine`)**: Computes geospatial grids, applies "what-if" modifications, and resamples grids based on zoom level.
4. **AI Engine (`/ai-engine`)**: PyTorch ConvLSTM and XGBoost ensemble forecasting service with uncertainty estimation.
5. **Graph Engine (`/graph-engine`)**: Evaluates spatial networks and simulates disaster cascades.
