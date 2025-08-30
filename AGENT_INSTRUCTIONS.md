Agent Instructions — AI-Powered Waste Mapping Dashboard

Purpose
-------
This file defines a small, strict, and actionable instruction set to be used by multiple autonomous agents working together to build the 4-hour MVP described in the PRD. It standardizes responsibilities, interfaces, data formats, coding and testing conventions, delivery checkpoints, and inter-agent communication patterns so agents can operate in parallel with minimal coordination friction.

High-level architecture
-----------------------
- Frontend: React + Leaflet.
- Backend: FastAPI (Python) preferred for quick MVP; Express (Node.js) acceptable if chosen.
- Data: in-repo static JSON (data/hotspots.json) + in-memory store for simulated updates.
- Realtime channel: Server-Sent Events (SSE) or WebSocket for alerts and live updates. SSE is simpler and recommended.

Agent roles (match PRD)
------------------------
Agent 1 — Map & Heatmap Visualization
- Deliverable: React app rendering map + heatmap, sidebar listing hotspots, "Generate Optimal Route" button, manual submission form UI.
- Inputs: /clusters and /route endpoints from backend.
- Expected files: frontend/* (React), use Leaflet + react-leaflet, heatmap plugin or gradient circle markers.

Agent 2 — AI/ML Hotspot Clustering
- Deliverable: /clusters endpoint returning cluster centroids and severity scores.
- Algorithm: DBSCAN (preferred) with default params: eps=0.002 (approx 200m — tweak by data scale), min_samples=3. If DBSCAN unavailable, KMeans with k heuristic (Elbow or simple 5).
- Output JSON shape: { clusters: [ { id, centroid: {lat,lng}, severity:int, count:int, points:[{lat,lng,severity}] } ], timestamp }
- Recompute clusters on POST /hotspots and on incoming simulated data.

Agent 3 — Alerts & Notifications
- Deliverable: SSE endpoint /events that pushes JSON notifications when new cluster appears or cluster severity crosses threshold.
- Thresholds: severity >= 5 triggers "high" alert. New cluster detection: compare cluster ids or centroid distance > eps.
- Simulated incoming data: backend worker pushes a new hotspot every N seconds (default 120s) when simulation ON.

Agent 4 — Route Optimization & Display
- Deliverable: /route endpoint returning ordered list of cluster centroids optimized by nearest-neighbor route starting from chosen origin (optional).
- Input: cluster centroids; Output shape: { route: [ {id,lat,lng,order} ], distance_meters }
- Optionally run one 2-opt pass to improve route. Keep run-time low (<200ms for small N).

Agent 5 — Manual Hotspot Submission + UI/UX Polish
- Deliverable: POST /hotspots to add a new point (body: {lat,lng,severity}) which triggers re-clustering and pushes an SSE alert if needed.
- UI: simple form on map; sidebar sorted by severity; small CSS/Tailwind for layout.

API contracts (required)
------------------------
- GET /hotspots -> { points: [{id,lat,lng,severity,timestamp}] }
- POST /hotspots -> 201 { ok:true, point: {...} } (triggers clustering)
- GET /clusters -> { clusters: [...] }
- POST /route -> { start?: {lat,lng}, clusterIds?: [id] } -> { route:[...], distance_meters }
- GET /events -> SSE stream sending JSON messages: { type: "alert"|"update", payload: {...}, timestamp }

Data & storage
--------------
- Keep data in-memory for MVP with periodic persistence to data/hotspots.json for reproducibility.
- Hotspot point shape: { id: uuid, lat: float, lng: float, severity: int(1-10), timestamp: ISO8601 }

Coding & style conventions
-------------------------
- Keep changes minimal and isolated per agent; add files under agent-specific folders (e.g., backend/, frontend/).
- Use linting: eslint for frontend, flake8 for Python backend (if applicable).
- Add short README files for how to run each component.

Runtime & dev commands (Windows pwsh)
-------------------------------------
- Backend (FastAPI):
  - python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt; uvicorn backend.main:app --reload --port 8000
- Frontend (React):
  - cd frontend; npm install; npm run dev (or npm start)

Testing & verification
----------------------
- Each agent must provide 3 quick manual test steps in its README:
  1) Start backend and frontend
  2) Load UI and confirm hotspots render
  3) Submit new hotspot and confirm SSE alert + map update

Simulation behavior
-------------------
- Simulation OFF by default. POST /simulate with { interval_seconds: 120, enabled:true } will start producing synthetic points near an area cluster.
- Synthetic points should vary severity 1-8 and be randomized within ~100-300m of chosen seed coords.

Time allocation (4-hour hackathon)
----------------------------------
- 0:00–0:30 — Project skeleton + basic run instructions (backend + frontend minimal stubs)
- 0:30–1:30 — Map + data load + manual submission (Agent 1 + 5)
- 1:30–2:30 — Clustering endpoint + re-cluster on new data (Agent 2)
- 2:30–3:15 — Alerts & simulation (Agent 3)
- 3:15–3:45 — Route optimization endpoint + frontend route draw (Agent 4)
- 3:45–4:00 — Demo polish, README, short script to run demo

Inter-agent collaboration rules
-------------------------------
- Strict API-first approach: agents only integrate via documented endpoints and SSE messages.
- Contracts are authoritative: any change to an API must be announced and a migration note added in AGENT_INSTRUCTIONS.md.
- Keep PRs small and self-contained. Add tests or manual verification steps in PR description.

Deliverables per agent (minimal)
--------------------------------
- Frontend: interactive map, sidebar, manual submission form, route polyline.
- Backend: endpoints: /hotspots, /clusters, /route, /events, /simulate.
- ML: clustering implementation (DBSCAN preferred) and clear parameter defaults.
- Alerts: SSE stream and simple alert messages used by frontend to show pop-ups.

Acceptance criteria
-------------------
- Heatmap displays hotspot intensity.
- Adding a hotspot (manual or simulated) updates clusters and shows an alert when threshold crossed.
- Route generation button draws an ordered polyline connecting cluster centroids.
- Full demo can be run locally with commands in READMEs within 10 minutes.

Change log
----------
- 2025-08-30: Initial file created.
- 2025-08-30: Agent 4 (Route Optimization) implemented with nearest-neighbor + 2-opt algorithms.
- 2025-08-30: Agent 2 (AI/ML Clustering) implemented with DBSCAN and K-Means algorithms.

Notes
-----
- Keep the implementation small and pragmatic. Prioritize a working end-to-end demo over perfect algorithms or production-grade features.
- Use simple in-memory stores to avoid external infra in the 4-hour timeframe.

