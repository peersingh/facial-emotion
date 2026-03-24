from fastapi import APIRouter, UploadFile, File
import cv2
import numpy as np
import tempfile
import os

from backend.services.face_emotion import EmotionDetector
from backend.services.voice_emotion import VoiceEmotionAnalyzer
from backend.services.fusion import MultimodalFusionEngine

router = APIRouter(tags=["Multimodal Fusion"])

face_detector = EmotionDetector()
voice_analyzer = VoiceEmotionAnalyzer()
fusion_engine = MultimodalFusionEngine()

@router.post("/detect/fusion")
async def detect_fusion(
    image: UploadFile = File(None),
    audio: UploadFile = File(None)
):
    face_result = None
    voice_result = None
    
    if image:
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            results = face_detector.detect_emotion(img)
            if results and 'dominant_emotion' in results[0]:
                face = results[0]
                face_result = {
                    "emotion": face['dominant_emotion'],
                    "confidence": float(face.get('emotion_confidence', 1.0))
                }
                
    if audio:
        contents = await audio.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav", mode="wb") as temp_audio:
            temp_audio.write(contents)
            temp_filepath = temp_audio.name
            
        voice_result = voice_analyzer.predict_emotion(temp_filepath)
        os.remove(temp_filepath)
        
    fused = fusion_engine.fuse(face_result, voice_result)
    
    return {
        "fused_result": fused,
        "raw_face": face_result,
        "raw_voice": voice_result
    }
