<div align="center">

# StockSense 📦

**Intelligent Retail POS & Automated Inventory Management with End-to-End DevOps Pipeline**

[Overview](#-overview) • [Tech Stack & Architecture](#%EF%B8%8F-tech-stack--architecture) • [Local Setup](#-running-locally-without-docker) • [Docker Deployment](#-running-with-docker-compose) • [Automated Testing](#-automated-testing) • [CI/CD Pipeline](#-cicd-pipeline-github-actions) • [Live Deployment](#-live-deployment) • [Screenshots](#-screenshots)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python](https://img.shields.io/badge/python-3.12%20%7C%203.14-brightgreen.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![Vite](https://img.shields.io/badge/Vite-6.0+-purple.svg)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED.svg?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF.svg?logo=githubactions&logoColor=white)

</div>

---

## 📌 Overview

**StockSense** is an intelligent, automated inventory management and Point of Sale (POS) system tailored for modern retail and kirana stores. It seamlessly unifies:
1. **Interactive POS Billing Counter** with instant cart operations and automated stock deductions.
2. **Real-Time Inventory Dashboard** featuring dynamic threshold tracking (`ok`, `warning`, `low`) and 5-second automatic state synchronization.
3. **Automated Vision AI Ingestion** powered by n8n and Gemini Vision AI to recognize products and restock directly from Telegram.
4. **Instant Low-Stock Notifications** dispatching automated webhook alerts whenever checkouts breach minimum thresholds.
5. **Complete End-to-End DevOps Lifecycle** featuring automated testing (pytest & vitest), multi-stage containerization with Docker Compose, and a full GitHub Actions CI/CD pipeline targeting GitHub Container Registry (`ghcr.io`).

---

## 🏛️ Tech Stack & Architecture

StockSense follows a microservices-ready multi-tier architecture with separate containerized services communicating over an isolated Docker bridge network:

```
+-------------------------------------------------------------------------------+
|                                CLIENT TIER                                    |
|   React 19 + TypeScript + Vite + TailwindCSS + Nginx Reverse Proxy (Port 3000)  |
+---------------------------------------+---------------------------------------+
                                        | (HTTP / Proxy)
                                        v
+-------------------------------------------------------------------------------+
|                                SERVER TIER                                    |
|              FastAPI + Uvicorn + Pydantic v2 Models (Port 8000)                |
|                    Healthcheck Endpoint: GET /health                          |
+--------------------+----------------------------------+-----------------------+
                     |                                  |
                     | (Motor Async Driver)             | (Outgoing Webhook)
                     v                                  v
+-----------------------------+       +-----------------------------------------+
|        DATABASE TIER        |       |            AUTOMATION TIER              |
|   MongoDB 7.0 (Port 27017)  |       |   n8n Workflow + Telegram Bot API       |
|    Persistent Named Volume  |       |        + Gemini Vision AI               |
+-----------------------------+       +-----------------------------------------+
```

### Technology Breakdown
- **Frontend (`/client`)**: React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, Vitest.
- **Backend (`/server`)**: Python 3.12+, FastAPI, Uvicorn, Motor (Async MongoDB), Pydantic v2, Pytest.
- **Database**: MongoDB 7.0 with persistent storage.
- **Containerization**: Multi-stage Dockerfiles (non-root `appuser`, minimal Nginx Alpine) orchestrated via `docker-compose.yml`.
- **CI/CD Automation**: GitHub Actions workflow (`.github/workflows/ci-cd.yml`) building, testing, containerizing, pushing to `ghcr.io`, and triggering deployment webhooks.

---

## 🚀 Running Locally (Without Docker)

### Prerequisites
- Node.js (v20+ or v22+) & npm
- Python (v3.12+) & `uv` (or `pip`)
- Running MongoDB instance (`mongodb://localhost:27017`)

### 1. Environment Setup
Copy the environment variables template in the root directory:
```bash
cp .env.example .env
cp .env.example server/.env
```
Ensure `MONGO_URI` is set to your MongoDB connection string (e.g., `mongodb://localhost:27017`).

### 2. Start Backend API
```bash
cd server
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# Or with standard venv:
# python -m venv .venv && source .venv/bin/activate (or .venv\Scripts\activate on Windows)
# pip install -r requirements.txt
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Backend API will be live at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

### 3. Start Frontend Client
```bash
cd client
npm install
npm run dev
```
Frontend will be live at `http://localhost:5173`.

---

## 🐳 Running with Docker Compose

Start the entire application stack (MongoDB + FastAPI Server + React/Nginx Client) with a single command:

```bash
docker compose up --build
```
Or run detached in the background:
```bash
docker compose up -d --build
```

### Exposed Endpoints in Docker
| Service | Container Port | Host Port | URL | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Client** | `80` | `3000` & `5173` | `http://localhost:3000` | Production React SPA served via Nginx |
| **Backend API** | `8000` | `8000` | `http://localhost:8000` | FastAPI REST API |
| **Health Check** | `8000` | `8000` | `http://localhost:8000/health` | Service health status endpoint |
| **MongoDB Database** | `27017` | `27017` | `mongodb://localhost:27017` | Persistent MongoDB 7.0 instance |

To view service logs:
```bash
docker compose logs -f
```

To stop all services and tear down containers:
```bash
docker compose down
```

---

## 🧪 Automated Testing

Automated testing is configured across both tiers using industry-standard frameworks:
- **Backend**: `pytest` & `pytest-asyncio` testing health endpoints, root availability, Pydantic schema validation, and threshold calculation logic.
- **Frontend**: `vitest` testing cart calculations, inventory status computation, filtering, and restock logic.

### Run All Tests (Single Command)
Run the root test script to execute both test suites sequentially:
```bash
npm test
```

### Run Tests Individually
```bash
# Run backend tests only
npm run test:server
# or directly:
pytest server -v

# Run frontend tests only
npm run test:client
# or directly:
cd client && npm test
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

The continuous integration and deployment workflow is defined in [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

### Pipeline Triggers
- **Pull Requests** targeting `main` or `master`.
- **Pushes** targeting `main` or `master`.

### Stages & Workflow Architecture

```
[Push / Pull Request]
        │
        ▼
┌────────────────────────────────────────────────────────┐
│  Stage 1: Automated Test & Build                       │
│  ├─ a. Checkout Code                                   │
│  ├─ b. Set up Python 3.12 & Node 22 Runtimes (Cached)  │
│  ├─ c. Install Backend & Frontend Dependencies         │
│  ├─ d. Run pytest (Backend) & vitest (Frontend)        │
│  └─ e. Build Frontend Production Bundle (`npm build`)  │
└──────────────────────────┬─────────────────────────────┘
                           │ (on success)
                           ▼
┌────────────────────────────────────────────────────────┐
│  Stage 2: Containerize, Push & Deploy                  │
│  ├─ f. Build Docker Images (Server & Client)           │
│  │     (Runs on all pushes & PRs to verify build)      │
│  │                                                     │
│  │── On Push to main/master:                           │
│  ├─ g. Log in to GitHub Container Registry (ghcr.io)   │
│  ├─ g. Push Server & Client images with tags (latest,sha)│
│  └─ h. Trigger Live Deployment (via DEPLOY_HOOK_URL)   │
└────────────────────────────────────────────────────────┘
```

### Deployment Configuration (`DEPLOY_HOOK_URL`)
The deployment step gracefully executes an external deployment webhook (such as Render or Railway deploy hooks). To connect your live host:
1. Navigate to your GitHub repository: **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret**.
3. Name: `DEPLOY_HOOK_URL`.
4. Value: Paste your deployment hook URL (e.g., `https://api.render.com/deploy/srv-xxxx?key=yyyy`).

*Note: If `DEPLOY_HOOK_URL` is not provided, the pipeline logs an informational notice and completes successfully without failing.*

---

## 🌐 Live Deployment

| Component | Target Environment | Deployment Status | Live URL |
| :--- | :--- | :--- | :--- |
| **Application** | Cloud Host (Render / Railway / Cloud VM) | Configured via Deploy Hook | `https://stocksense-demo.example.com` *(Replace with your live URL)* |
| **Container Registry** | GitHub Container Registry (GHCR) | Automated via CI/CD | `ghcr.io/<your-github-username>/stocksense/server:latest`<br/>`ghcr.io/<your-github-username>/stocksense/client:latest` |

---

## 📷 Screenshots

### 1. Repository Structure & Configuration (`repo`)
<!-- Empty placeholder: repo -->
![repo](images/screenshots/repo.png)

### 2. GitHub Actions CI/CD Pipeline Execution (`actions-pipeline`)
<!-- Empty placeholder: actions-pipeline -->
![actions-pipeline](images/screenshots/actions-pipeline.png)

### 3. Docker Compose Running Containers (`docker-running`)
<!-- Empty placeholder: docker-running -->
![docker-running](images/screenshots/docker-running.png)

### 4. Application Live In Browser (`app-live`)
<!-- Empty placeholder: app-live -->
![app-live](images/screenshots/app-live.png)

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
