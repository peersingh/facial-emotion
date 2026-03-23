from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import time

from core_ai.emotion_detector import EmotionDetector
from core_ai.state_tracker import EmotionStateTracker

app = FastAPI(title="Multimodal Emotion Intelligence Platform (MEIP) API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = EmotionDetector()

@app.get("/")
def read_root():
    return {"status": "MEIP API is running cleanly"}

@app.post("/detect-image")
async def detect_image(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"error": "Invalid image file"}
        
    results = detector.detect_emotion(img)
    
    if results and 'dominant_emotion' in results[0]:
        face = results[0]
        return {
            "emotion": face['dominant_emotion'],
            "confidence": float(face.get('emotion_confidence', 1.0)),
            "timestamp": time.time(),
            "region": face.get('region')
        }
        
    return {"error": "No face detected"}

import asyncio

@app.websocket("/stream")
async def detect_video_stream(websocket: WebSocket):
    await websocket.accept()
    tracker = EmotionStateTracker()
    
    try:
        while True:
            import base64
            data_text = await websocket.receive_text()
            
            if "," in data_text:
                encoded_data = data_text.split(",", 1)[1]
            else:
                encoded_data = data_text
                
            try:
                decoded_bytes = base64.b64decode(encoded_data)
                nparr = np.frombuffer(decoded_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except Exception as e:
                print("Decode error:", e)
                continue
            
            if img is not None:
                # Run the AI detection directly. (Running in to_thread causes TF graph exceptions)
                results = detector.detect_emotion(img)
                
                if results and 'dominant_emotion' in results[0]:
                    face = results[0]
                    dom = face['dominant_emotion']
                    conf = float(face.get('emotion_confidence', 1.0))
                    
                    smoothed, insight = tracker.process_prediction(dom, conf)
                    
                    await websocket.send_json({
                        "emotion": smoothed,
                        "insight": insight,
                        "confidence": conf,
                        "timestamp": time.time()
                    })
                else:
                    smoothed, insight = tracker._evaluate_state()
                    await websocket.send_json({
                        "emotion": smoothed,
                        "insight": insight,
                        "confidence": 0.0,
                        "timestamp": time.time(),
                        "warning": "No face detected"
                    })
    except WebSocketDisconnect:
        print("Client disconnected from stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="127.0.0.1", port=8080, reload=True)
