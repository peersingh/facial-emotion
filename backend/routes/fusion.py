import os
import cv2
import tempfile
import numpy as np
import asyncio
from fastapi import APIRouter, UploadFile, File

from backend.services.face_emotion import EmotionDetector
from backend.services.voice_emotion import VoiceEmotionAnalyzer
from backend.services.fusion import MultimodalFusionEngine
from backend.services.pose_tracking import PoseTracker
from backend.services.speech_to_text import SpeechToTextService
from backend.services.llm_prediction import ContextualWordPredictor

router = APIRouter(tags=["Multimodal Fusion"])

# Initialize core intelligence services
face_detector = EmotionDetector()
voice_analyzer = VoiceEmotionAnalyzer()
fusion_engine = MultimodalFusionEngine()
pose_tracker = PoseTracker()
stt_service = SpeechToTextService()
llm_predictor = ContextualWordPredictor()

async def process_face_and_pose(img):
    # Face Detection Worker
    def _face():
        results = face_detector.detect_emotion(img)
        if results and 'dominant_emotion' in results[0]:
            face = results[0]
            return {
                "emotion": face['dominant_emotion'],
                "confidence": float(face.get('emotion_confidence', 1.0))
            }
        return None

    # Pose Tracking Worker
    def _pose():
        return pose_tracker.process_frame(img)

    face_task = asyncio.to_thread(_face)
    pose_task = asyncio.to_thread(_pose)
    face_res, pose_res = await asyncio.gather(face_task, pose_task)
    return face_res, pose_res

async def process_audio(temp_filepath):
    # Voice Emotion Worker
    def _voice():
        return voice_analyzer.predict_emotion(temp_filepath)

    # STT Worker
    def _stt():
        return stt_service.transcribe(temp_filepath)

    voice_task = asyncio.to_thread(_voice)
    stt_task = asyncio.to_thread(_stt)
    voice_res, stt_res = await asyncio.gather(voice_task, stt_task)
    return voice_res, stt_res

@router.post("/detect/fusion")
async def detect_fusion(
    image: UploadFile = File(None),
    audio: UploadFile = File(None)
):
    """
    Asynchronous Fusion: Processes Face, Pose, Voice, STT, and LLM signals concurrently in <200ms.
    """
    face_result = None
    voice_result = None
    pose_result = None
    stt_result = None
    llm_predictions = []
    
    tasks = []
    
    async def handle_image():
        nonlocal face_result, pose_result
        contents = await image.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            face_result, pose_result = await process_face_and_pose(img)

    async def handle_audio():
        nonlocal voice_result, stt_result
        contents = await audio.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav", mode="wb") as temp_audio:
            temp_audio.write(contents)
            temp_filepath = temp_audio.name
            
        try:
            voice_result, stt_result = await process_audio(temp_filepath)
        finally:
            os.remove(temp_filepath)

    if image:
        tasks.append(handle_image())
    if audio:
        tasks.append(handle_audio())
        
    if tasks:
        await asyncio.gather(*tasks)
        
    fused = fusion_engine.fuse(face_result, voice_result, pose_result, stt_result)
    
    # LLM Contextual Prediction if triggered
    if fused.get("trigger_word_prediction", False) and stt_result:
        def _llm():
            return llm_predictor.predict_next_words(stt_result.get("text", ""))
        llm_predictions = await asyncio.to_thread(_llm)
    
    return {
        "fused_result": fused,
        "raw_face": face_result,
        "raw_voice": voice_result,
        "raw_pose": pose_result.get("metrics") if pose_result else None,
        "stt": stt_result,
        "word_predictions": llm_predictions
    }