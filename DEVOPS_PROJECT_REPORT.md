# StockSense — End-to-End DevOps Project Report & Evaluation Guide
**Agile & DevOps Lab Evaluation Document**
**Project:** StockSense — Intelligent Retail POS & Automated Inventory Management  
**Repository:** [https://github.com/Infindev7/StockSense](https://github.com/Infindev7/StockSense)  
**Branch:** `master`

---

## 1. Executive Summary

StockSense is an automated retail management solution that integrates a high-performance React POS frontend, an asynchronous FastAPI backend, a MongoDB datastore, and an n8n Telegram AI vision workflow.

This project implements a complete, industry-standard **End-to-End DevOps Lifecycle**:
1. **Version Control**: Git workflow with structured conventional commits, zero secret leakage, and clean branch management.
2. **Automated Testing**: Dual-tier testing suite (`pytest` for Python FastAPI backend, `vitest` for React TypeScript frontend) unified under a single `npm test` command.
3. **Containerization**: Multi-stage production Dockerfiles adhering to non-root least-privilege security principles, orchestrated via `docker-compose.yml` with automated container health checks.
4. **CI/CD Automation**: GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) automating dependency caching, unit testing, bundle builds, Docker multi-stage builds, GitHub Container Registry (`ghcr.io`) publishing, and zero-downtime deployment triggers.

---

## 2. Architecture & Service Topology

```
                                  [ INTERNET / BROWSER ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼ (Port 3000 / 5173)                        ▼ (Port 8000)
        ┌───────────────────────────────┐           ┌───────────────────────────────┐
        │       CLIENT SERVICE          │           │       SERVER SERVICE          │
        │  React 19 + TypeScript + Vite │           │  FastAPI + Uvicorn + Pydantic │
        │  Nginx 1.27 Alpine Container  │           │  Python 3.12 Slim Container   │
        │  Healthcheck: GET /health     │           │  Healthcheck: GET /health     │
        └──────────────┬────────────────┘           └──────────────┬────────────────┘
                       │                                           │
                       │ (API Requests)                            │ (Async Motor Driver)
                       └───────────────────►◄──────────────────────┘
                                             │
                                             ▼ (Port 27017)
                                ┌───────────────────────────────┐
                                │       DATABASE SERVICE        │
                                │   MongoDB 7.0 Community       │
                                │   Persistent Named Volume     │
                                └───────────────────────────────┘
```

---

## 3. DevOps Pipeline Specifications

### Stage 1: Continuous Integration (Test & Build)
Defined in `.github/workflows/ci-cd.yml`:
- **Triggers**: Every pull request and push to `main` or `master`.
- **Runtimes**: Python 3.12 (with pip caching) and Node.js 22 (with npm caching).
- **Backend Testing**: `python -m pytest server -v` (Tests `/health`, `/`, Pydantic validation schemas, and threshold business logic).
- **Frontend Testing**: `npm --prefix client test` (Vitest testing cart calculations, badge thresholds, and inventory filtering).
- **Application Build**: `npm --prefix client run build` compiles TypeScript into static production assets.

### Stage 2: Continuous Delivery & Containerization
- **Docker Build Validation**: Builds `stocksense-server` and `stocksense-client` images with Buildx caching on all PRs and pushes to guarantee build integrity.
- **Image Registry**: On push to `main`/`master`, images are automatically tagged with commit SHA and `latest`, then pushed to GitHub Container Registry:
  - `ghcr.io/infindev7/stocksense/server:latest`
  - `ghcr.io/infindev7/stocksense/client:latest`
- **Continuous Deployment**: Dedicated triggers call external deployment hooks (`BACKEND_DEPLOY_HOOK_URL`, `FRONTEND_DEPLOY_HOOK_URL`) with sanitized inputs and resilient exit-code handling.

---

## 4. How to Run the Project

### A. One-Command Docker Compose (Local Demonstration)
```bash
# Start all microservices in detached mode
docker compose up -d --build

# Verify all containers are healthy
docker compose ps

# View real-time logs
docker compose logs -f

# Stop all containers
docker compose down
```

### B. Local Development (Without Docker)
```bash
# 1. Setup environment templates
cp .env.example .env
cp .env.example server/.env

# 2. Start Backend
cd server
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# 3. Start Frontend
cd ../client
npm install
npm run dev
```

### C. Run All Automated Tests
```bash
npm test
```

---

## 5. Endpoints & Verification Matrix

| Endpoint | Method | Service | Expected Response | Verified Status |
| :--- | :--- | :--- | :--- | :--- |
| `http://localhost:8000/health` | `GET` | FastAPI Backend | `{"status":"healthy","service":"StockSense Backend API"}` | ✅ HTTP 200 |
| `http://localhost:8000/` | `GET` | FastAPI Backend | `{"status":"ok","message":"StockSense Backend API is running"}` | ✅ HTTP 200 |
| `http://localhost:8000/api/inventory` | `GET` | FastAPI + MongoDB | `[{"success":true,"count":...,"products":[...]}]` | ✅ HTTP 200 |
| `http://localhost:3000/` | `GET` | React / Nginx | SPA HTML application entry point | ✅ HTTP 200 |
| `http://localhost:3000/health` | `GET` | React / Nginx | `{"status":"healthy","service":"StockSense Frontend"}` | ✅ HTTP 200 |

---

## 6. Project Files Manifest

- `.github/workflows/ci-cd.yml` — Multi-stage GitHub Actions CI/CD automation.
- `docker-compose.yml` — Container orchestration for client, server, and MongoDB with health checks.
- `server/Dockerfile` — Multi-stage Python 3.12 slim container with non-root security.
- `server/requirements.txt` — Frozen production dependencies for server container.
- `server/tests/test_server.py` — Automated backend unit test suite.
- `client/Dockerfile` — Multi-stage Node 22 build + Nginx Alpine runtime container.
- `client/nginx.conf` — Nginx SPA routing and health check configuration.
- `client/src/__tests__/logic.test.ts` — Automated frontend unit test suite.
- `package.json` — Root orchestration file for unified testing and building.
- `.env.example` — Environment variable schema without hardcoded secrets.
- `README.md` — Complete repository documentation.
