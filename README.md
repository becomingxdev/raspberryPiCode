# AgreBot — Agricultural Inspection System

A lightweight, self-contained edge inspection system with an ML-powered backend and modern React dashboard.

---

## Architecture

```
                    Local Network / Same Wi-Fi
Laptop (Frontend)  ◄────────────────────────►  Raspberry Pi / Laptop (Backend + ML)
  - React 19                                      - Flask + flask-cors (Open CORS)
  - Vite + Tailwind CSS                           - PyTorch ResNet-18 (216 classes)
  - Runs on port 3000                             - Runs on port 5000
```

---

## Folder Structure

```
finalCodebase/
├── .gitignore                ← Configured for Git (ignores venv, node_modules, temp files)
├── README.md                 ← This guide
│
├── backend/                  ← Self-contained Flask + ML backend
│   ├── main.py               ← Run this (on laptop or Raspberry Pi)
│   ├── requirements.txt      ← Python dependencies
│   ├── .env.example          ← Example configuration
│   ├── models/
│   │   └── combined/
│   │       ├── combined_model.pth   ← Production trained weights (~43 MB)
│   │       └── class_names.json     ← 216 agricultural class names
│   └── app/
│       ├── __init__.py       ← Flask factory with open CORS
│       ├── config.py         ← Configuration & auto model path resolution
│       ├── errors.py
│       ├── api/              ← REST routes: health, camera, video, detection
│       ├── ml/               ← crop_adapter, annotate, model_adapter
│       └── services/         ← camera_service, inference_service, detection_service, pipeline
│
└── frontend/                 ← React dashboard
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.tsx           ← 3-step state flow
        ├── components/       ← BackendConnectScreen, CameraConnectScreen, VideoPanel, detections
        ├── hooks/            ← useLatestDetection, useDetectionHistory
        ├── lib/api/          ← baseUrl, client, endpoints, types
        └── styles/index.css
```

---

## 1. Quick Testing on Laptop (Local Run)

You can run and test both backend and frontend on your laptop right now:

### Step A: Start the Backend (Terminal 1)
```bash
cd finalCodebase/backend

# Optional: create and activate a virtual environment
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
`main.py` will display:
```
============================================================
  AgreBot — Agricultural Inspection System
============================================================

  ✅ Backend URL  :  http://127.0.0.1:5000
  (or your laptop's local Wi-Fi IP, e.g., http://192.168.1.x:5000)
============================================================
```

### Step B: Start the Frontend (Terminal 2)
```bash
cd finalCodebase/frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 2. Deploying to Raspberry Pi (Via Git)

The `finalCodebase` folder is completely self-contained. The model weights (`combined_model.pth`, ~43MB) are stored in `backend/models/combined/` and included in Git commits.

### Push from your Laptop:
```bash
cd finalCodebase
git init
git add .
git commit -m "Initial commit of self-contained AgreBot"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Run on Raspberry Pi:
```bash
git clone <your-github-repo-url>
cd finalCodebase/backend

pip install -r requirements.txt
python main.py
```
The terminal on the Pi will print its network IP:
```
  ✅ Backend URL  :  http://192.168.x.x:5000
```
Then on your laptop browser (`http://localhost:3000`), enter that Pi IP into the connection box!

---

## 3. User Flow in Dashboard

1. **Step 1 — Connect Backend:**
   - Type your backend URL (e.g. `http://127.0.0.1:5000` for laptop test, or `http://192.168.1.105:5000` for Raspberry Pi) and click **Connect**.
2. **Step 2 — Connect IP Webcam:**
   - Type your phone IP Webcam address (e.g. `http://192.168.1.200:8080/video`) or enter `0` to use your laptop's built-in webcam!
3. **Step 3 — Live Inspection:**
   - The dashboard opens with the annotated MJPEG stream, live disease status, and persistent detection logs.
