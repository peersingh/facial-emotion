from fastapi import APIRouter, UploadFile, File, WebSocket, WebSocketDisconnect
import cv2
import numpy as np
import time
import base64
import asyncio

from backend.services.face_emotion import EmotionDetector
from backend.services.smoothing import EmotionStateTracker
from backend.utils.logger import EmotionLogger

router = APIRouter(tags=["Emotion Analysis"])

detector = EmotionDetector()

@router.post("/detect/image")
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

@router.websocket("/stream")
async def detect_video_stream(websocket: WebSocket):
    await websocket.accept()
    tracker = EmotionStateTracker()
    session_logger = EmotionLogger()
    
    try:
        while True:
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
                # Execute inference directly within the active thread to avoid TensorFlow graph memory leak isolation bugs
                results = detector.detect_emotion(img)
                
                if results and 'dominant_emotion' in results[0]:
                    face = results[0]
                    dom = face['dominant_emotion']
                    conf = float(face.get('emotion_confidence', 1.0))
                    
                    smoothed, insight = tracker.process_prediction(dom, conf)
                    session_logger.log_event(smoothed, conf, source="face")
                    
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
