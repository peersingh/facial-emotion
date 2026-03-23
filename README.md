# 🧠 Multimodal Emotion Intelligence Platform (MEIP)

> A real-time, stateful emotion tracking and intelligence platform that moves beyond static emotion classification to deliver actionable, time-smoothed behavioral insights.

![MEIP Interface](frontend/public/vite.svg) *(Optional: Replace with a screenshot of the dashboard)*

## 🌟 Overview
MEIP is a modern, high-performance platform designed to parse human emotional states through visual tracking. Unlike basic ML pipelines that just return "happy" or "sad," MEIP features an **Intelligence Layer** that utilizes temporal smoothing to monitor emotion states over time, allowing it to derive complex insights (e.g., classifying sustained *Sadness* as *Depressed/Down* or *Happy* as *Joyful*).

The platform consists of a lightweight **FastAPI Backend** and a beautiful, custom-designed **React Glassmorphism Frontend**.

## 🚀 Key Features

* **Real-Time Video Stream**: Securely streams webcam frames to the edge server via WebSockets for zero-latency AI analysis.
* **Static Image Analysis**: High-resolution image upload module via REST API for instant static emotion parsing.
* **Stateful Intelligence Tracking**: Maps raw neural network metrics against historical trajectory to establish *Confident Insights*.
* **Dynamic Time-Series Matrix**: Real-time graphing of emotional confidence mapping using Recharts.
* **Premium Dashboard UI**: Designed from scratch using Tailwind CSS, featuring heavy glassmorphism, animated elements, and responsive scaling.

## 🛠️ Technology Stack

**Backend (Intelligence Layer):**
* Python 3.10+
* **FastAPI** & **Uvicorn** (REST & WebSockets on Port `8080`)
* **DeepFace** (Facial recognition & Emotion parsing)
* **OpenCV** (Image matrix decoding)
* **TensorFlow** (Underlying neural inference)

**Frontend (Presentation Layer):**
* **React** (Vite build system)
* **Tailwind CSS** (Utility-first styling mechanism)
* **Lucide React** (Vector iconography)
* **Recharts** (Temporal telemetry)
* **React-Webcam** (Media stream capture)

---

## 🏗️ Project Architecture

```text
happiness project/
├── api/
│   └── main.py                 # FastAPI routing, WebSockets, & JSON serialization
├── core_ai/
│   ├── emotion_detector.py     # DeepFace wrapper & logic extraction
│   └── state_tracker.py        # Temporal sliding-window memory heuristic map
├── frontend/
│   ├── src/App.jsx             # Main React Application & dynamic UI state 
│   ├── src/index.css           # Tailwind configurations
│   └── package.json            # Node dependencies
├── requirements.txt            # Python backend dependencies
└── run_meip.ps1                # Automated Windows Bootstrapper
```

---

## ⚡ Setup & Installation

### 1. Backend Setup
Ensure you have Python 3.10+ installed.
```powershell
# Create an isolated virtual environment
python -m venv venv

# Activate the environment (Windows)
.\venv\Scripts\Activate.ps1

# Install the intelligence dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup
Ensure you have Node.js installed.
```powershell
# Navigate to the frontend directory
cd frontend

# Install Node modules
npm install
```

*(Note: On initial boot, DeepFace will automatically download the necessary AI models to your local machine. This may take ~1-2 minutes depending on connection speeds.)*

---

## 🎮 Running the Platform

### The Automated Way (Windows)
If you are on Windows, simply execute the custom runner script from the project root. It will automatically spawn the Backend and Frontend servers in parallel.
```powershell
.\run_meip.ps1
```

### The Manual Way
**Terminal 1 (Backend):**
```powershell
.\venv\Scripts\Activate.ps1
uvicorn api.main:app --port 8080 --reload
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```

The Web UI will be instantly available at `http://localhost:5173`.
The Backend OpenAPI documentation will be visible at `http://localhost:8080/docs`.

---

## 🔜 Roadmap (Phase 5+)
This project is continuously evolving. Our next immediate milestone includes integrating **Voice Emotion Detection** logic alongside the Video Stream to perfectly align verbal tones with spatial facial behavior, resulting in multi-dimensional empathy intelligence.
