<div align="center">

# StockSense 📦

**Intelligent Retail POS : Automate inventory management with Gemini Vision AI and real-time syncing.**

[Overview](#-overview--screenshots) • [Architecture](#%EF%B8%8F-project-structure) • [n8n Workflow](#-n8n-automated-vision-workflow) • [Quick Start](#-quick-start-guide)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python](https://img.shields.io/badge/python-3.11+-brightgreen.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-teal.svg)

</div>

<br/>

StockSense is an intelligent, automated inventory management and POS system built to simplify Kirana store (retail) operations. It seamlessly blends a **FastAPI/MongoDB Backend**, a **React Frontend**, and an **n8n Automated Workflow** equipped with **Gemini Vision AI** to let you instantly restock your shelves by simply taking a picture of the product.

## 📸 Overview & Screenshots

### POS Billing Dashboard
A high-performance Point of Sale (POS) counter built with React. Add products to your bill, manage stock dynamically, and check out with real-time sync to MongoDB.

![Billing Frontend](<images/StockSense - Billing Frontend.png>)

### Live Inventory Management
View your products, monitor real-time stock levels, sort, and manage low-stock thresholds. Fully hooked up to the backend.

![Inventory](<images/StockSense - Inventory.png>)

### Telegram Vision AI Restocking
Simply send an image of a product with its quantity to the Telegram bot. StockSense's n8n workflow uses Gemini Vision API to instantly recognize the product and add it directly to your inventory database.

![Telegram Vision AI](<images/StockSense - Telegram Vision AI.png>)

### Real-Time Restock Alerts
Whenever a checkout causes a product's stock to drop below its minimum threshold, the FastAPI backend instantly triggers an n8n webhook to alert you!

![Telegram Restock Alert](<images/StockSense - Telegram Restock Alert.png>)
![Restock Alert Details](<images/Restock Alert.png>)

---

## 🛠️ Project Structure

The project is split into three main components:

- `/client` - **React Frontend** 
  - Developed using Vite and React.
  - Contains `App.tsx` (main router/state), `BillingCounter.tsx` (POS interface), and `InventoryStatus.tsx` (Dashboard).
  - Continuously polls the backend for live inventory status.

- `/server` - **FastAPI Backend**
  - Powered by Python, FastAPI, and `uv` package manager.
  - Asynchronous Motor MongoDB connection (`database.py`).
  - Strict data validation using Pydantic (`models.py`).
  - Endpoints to process checkouts (`routes/checkout.py`), handle inventory (`routes/inventory.py`), and fire outgoing restock webhooks.

- **n8n Workflow**
  - Connects the Telegram bot to Gemini AI and MongoDB to automate visual product additions.

---

## 🤖 n8n Automated Vision Workflow

Below is the flowchart representing the n8n automation pipeline that processes incoming Telegram messages, runs Gemini Vision AI, and safely injects the data into the database.

```mermaid
graph TD
    %% Nodes
    A["Telegram Trigger"] --> B["Edit Fields"]
    A --> ERROR["Send Error Message"]
    
    B --> C{"Is /start Command?"}
    
    C -- Yes --> D["Send Intro Message"]
    C -- No --> E["Send Processing Message"]
    
    E --> F["Validate & Extract Message"]
    F --> ERROR
    F --> G["Get Telegram File Path"]
    
    G --> H["Download Image Binary"]
    H --> I["Prepare Image for Vision"]
    I --> J["Code: Generate Gemini Payload"]
    
    J --> GEMINI1["Gemini Vision API (Primary)"]
    
    %% Gemini Retry Logic
    GEMINI1 --> K["Parse Vision Response"]
    GEMINI1 -- Fail --> GEMINI2["Gemini Vision API (Retry 1)"]
    GEMINI2 --> K
    GEMINI2 -- Fail --> GEMINI3["Gemini Vision API (Retry 2)"]
    GEMINI3 --> K
    GEMINI3 -- Fail --> ERROR
    
    K --> ERROR
    K --> L["Check If Product Exists (MongoDB)"]
    
    L --> M{"Product Exists?"}
    
    M -- Yes --> N["Increment Existing Stock"]
    M -- No --> O["Format New Product"]
    O --> P["Insert New Product"]
    
    N --> Q["Log Restock Event"]
    P --> Q
    
    Q --> R["Send Confirmation to Owner"]
    
    %% Styling
    classDef trigger fill:#1abc9c,stroke:#16a085,stroke-width:2px,color:#fff;
    classDef logic fill:#f39c12,stroke:#e67e22,stroke-width:2px,color:#fff;
    classDef api fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff;
    classDef db fill:#9b59b6,stroke:#8e44ad,stroke-width:2px,color:#fff;
    classDef tg fill:#2980b9,stroke:#2471a3,stroke-width:2px,color:#fff;
    classDef err fill:#e74c3c,stroke:#c0392b,stroke-width:2px,color:#fff;
    
    class A trigger;
    class C,F,K,M logic;
    class GEMINI1,GEMINI2,GEMINI3 api;
    class L,N,P,Q db;
    class D,E,ERROR,R tg;
```

---

## 🚀 Quick Start Guide

### 1. Database & Environment
1. Ensure you have a MongoDB cluster ready.
2. Inside the `/server` directory, duplicate `.env.example` into `.env` and fill in:
   - `MONGO_URI`: Your database string
   - `N8N_RESTOCK_WEBHOOK_URL`: Your webhook for low stock notifications

### 2. Start the Backend (FastAPI)
```bash
cd server
uv run uvicorn main:app --reload
```

### 3. Start the Frontend (React)
```bash
cd client
npm install
npm run dev
```

Your system is now completely connected and operational!
