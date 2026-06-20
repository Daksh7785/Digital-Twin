import networkx as nx
import numpy as np
from fastapi import FastAPI, Query
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Climate Graph Engine", version="1.0.0")

# Predefined India Climate Corridor coordinates (nodes)
CORRIDOR_NODES = [
    {"id": "NW_Himalayas", "name": "Northwest Himalayas", "lat": 32.5, "lon": 76.0},
    {"id": "NE_Himalayas", "name": "Northeast Himalayas", "lat": 27.5, "lon": 92.0},
    {"id": "Indo_Gangetic", "name": "Indo-Gangetic Plain", "lat": 26.0, "lon": 80.0},
    {"id": "Central_Highlands", "name": "Central Highlands", "lat": 23.0, "lon": 77.0},
    {"id": "Thar_Desert", "name": "Thar Desert", "lat": 26.5, "lon": 71.0},
    {"id": "Deccan_Plateau", "name": "Deccan Plateau", "lat": 16.0, "lon": 76.0},
    {"id": "Western_Ghats", "name": "Western Ghats Corridor", "lat": 12.0, "lon": 75.5},
    {"id": "Eastern_Ghats", "name": "Eastern Ghats Corridor", "lat": 15.0, "lon": 79.5},
    {"id": "Coastal_South", "name": "Coastal South India", "lat": 9.0, "lon": 77.0}
]

def build_climate_network() -> nx.Graph:
    G = nx.Graph()
    # Add nodes
    for node in CORRIDOR_NODES:
        G.add_node(
            node["id"],
            name=node["name"],
            lat=node["lat"],
            lon=node["lon"],
            vulnerability=round(np.random.uniform(0.1, 0.4), 2)
        )
    
    # Connect nodes based on spatial proximity (teleconnections)
    connections = [
        ("NW_Himalayas", "NE_Himalayas"),
        ("NW_Himalayas", "Indo_Gangetic"),
        ("NE_Himalayas", "Indo_Gangetic"),
        ("Indo_Gangetic", "Central_Highlands"),
        ("Thar_Desert", "Central_Highlands"),
        ("Thar_Desert", "Deccan_Plateau"),
        ("Central_Highlands", "Deccan_Plateau"),
        ("Central_Highlands", "Eastern_Ghats"),
        ("Deccan_Plateau", "Western_Ghats"),
        ("Deccan_Plateau", "Eastern_Ghats"),
        ("Western_Ghats", "Coastal_South"),
        ("Eastern_Ghats", "Coastal_South")
    ]
    
    for u, v in connections:
        # Distance approximation
        lat_diff = G.nodes[u]["lat"] - G.nodes[v]["lat"]
        lon_diff = G.nodes[u]["lon"] - G.nodes[v]["lon"]
        dist = np.sqrt(lat_diff**2 + lon_diff**2)
        
        # Edge weight represents coupling strength (inversely proportional to distance)
        weight = round(1.0 / (dist + 0.1), 2)
        G.add_edge(u, v, weight=weight)
        
    return G

@app.get("/health")
def health():
    return {"status": "healthy", "service": "graph-engine"}

@app.get("/api/graph")
def get_graph():
    """
    Returns the network graph structure with centrality metric overlays.
    """
    G = build_climate_network()
    
    # Calculate Betweenness Centrality
    centrality = nx.betweenness_centrality(G, weight="weight")
    
    nodes_list = []
    for node_id, data in G.nodes(data=True):
        nodes_list.append({
            "id": node_id,
            "name": data["name"],
            "lat": data["lat"],
            "lon": data["lon"],
            "vulnerability": data["vulnerability"],
            "centrality": round(centrality[node_id], 3)
        })
        
    edges_list = []
    for u, v, data in G.edges(data=True):
        edges_list.append({
            "source": u,
            "target": v,
            "weight": data["weight"]
        })
        
    return {
        "nodes": nodes_list,
        "edges": edges_list
    }

@app.post("/api/simulate-failure")
def simulate_failure(trigger_node: str = Query(..., description="Node ID where the disaster or failure starts")):
    """
    Simulates cascading climate disruption across the network starting from a single node.
    """
    G = build_climate_network()
    if trigger_node not in G:
        return {"error": "Invalid trigger node"}
        
    # Simulate cascade using BFS
    cascade_history = []
    affected_nodes = {trigger_node: 1.0} # node_id -> damage level
    queue = [trigger_node]
    
    while queue:
        current = queue.pop(0)
        current_damage = affected_nodes[current]
        
        for neighbor in G.neighbors(current):
            if neighbor not in affected_nodes:
                # Transmit damage across coupling edge weights
                edge_weight = G[current][neighbor]["weight"]
                damage = current_damage * edge_weight * 0.75
                
                if damage > 0.1: # Threshold to propagate
                    affected_nodes[neighbor] = round(damage, 2)
                    queue.append(neighbor)
                    cascade_history.append({
                        "from": current,
                        "to": neighbor,
                        "damage_transferred": round(damage, 2)
                    })
                    
    return {
        "trigger": trigger_node,
        "affected_nodes": affected_nodes,
        "cascade_flow": cascade_history
    }
