# 🧠 Multimodal Emotion Intelligence Platform (MEIP) v2.9

> A production-grade, stateful multimodal emotion tracking platform combining Adaptive High-Precision Facial ROI and FFMPEG-Free Acoustic Intelligence.

![MEIP Interface](frontend/public/vite.svg)

## 🌟 Overview
MEIP is a modern, high-performance platform designed to parse human emotional states through visual and auditory tracking. Unlike basic ML pipelines, MEIP features a **Multimodal Intelligence Layer** that synchronizes facial expressions with vocal acoustics to deliver actionable insights.

## 🚀 Key Features

* **Live Intelligence Stream**: Synchronized WebSocket pipeline with request-response locking for zero-latency frame analysis.
* **High-Precision Face ROI**: Utilizes **MTCNN** for superior facial alignment and emotion classification accuracy.
* **FFMPEG-Free Voice Analytics**: Client-side **PCM WAV Encoding** enables live microphone recording on any machine without external media dependencies.
* **Multimodal Fusion**: Synergistic decision matrix that resolves emotional conflicts between visual and vocal inputs.
* **Premium Glassmorphism UI**: Custom React dashboard with dynamic dark mode, SVG donut confidence gauging, and temporal session tracking.

## 🏗️ Project Architecture

```text
happiness project/
├── backend/
│   ├── routes/             # FastAPI APIRouters (emotion, audio, fusion, analytics)
│   ├── services/           # AI engines (DeepFace, Librosa, MTCNN)
│   ├── utils/              # Session logging & telemetry
│   └── main.py             # App bootstrap
├── frontend/
│   ├── src/App.jsx         # React Hub & PCM WAV Encoder
│   └── index.css           # Premium Design System
├── data/                   # Session logs & static weights
├── requirements.txt        # Production dependencies (MTCNN, DeepFace, Librosa)
└── run_meip.ps1            # Automated Windows Bootstrapper
```

## ⚡ Setup & Installation

### 1. Unified Boot (Windows)
```powershell
.\run_meip.ps1
```

### 2. Manual Installation
**Backend:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --port 8080 --reload
```

**Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

---

## 🔝 Version History Highlights
* **v2.9**: Implemented Adaptive Detector Optimization (Hybrid OpenCV/MTCNN engine for speed & precision).
* **v2.8**: Switched to MTCNN for near-perfect facial ROI alignment.
* **v2.7**: Native Browser PCM WAV encoding (Removes FFMPEG requirement).
* **v2.6**: Acoustic peak-normalization and heuristic recalibration.
* **v2.5**: Modular FastAPI refactor and Static Fusion launch.

