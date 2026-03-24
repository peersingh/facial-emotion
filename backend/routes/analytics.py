from fastapi import APIRouter
import os
import json

router = APIRouter(tags=["Emotion Analytics"])

@router.get("/analytics/sessions")
def get_sessions():
    sessions = []
    log_dir = "data/sessions"
    if os.path.exists(log_dir):
        # Sort by newest first
        files = sorted(os.listdir(log_dir), reverse=True)
        for f in files:
            if f.endswith(".json"):
                file_path = os.path.join(log_dir, f)
                size = os.path.getsize(file_path)
                sessions.append({
                    "id": f, 
                    "size_kb": round(size / 1024, 1),
                    "timestamp": f.replace("session_", "").replace(".json", "")
                })
    return {"sessions": sessions}

@router.get("/analytics/sessions/{session_id}")
def get_session_data(session_id: str):
    log_path = os.path.join("data/sessions", session_id)
    if os.path.exists(log_path):
        try:
            with open(log_path, "r") as f:
                return json.load(f)
        except Exception as e:
            return {"error": str(e)}
    return {"error": "Session not found"}
