import os
import time
import asyncio
import tempfile
import traceback
from fastapi import APIRouter, UploadFile, File

from backend.services.voice_emotion import VoiceEmotionAnalyzer

router = APIRouter(tags=["Audio Analysis"])
analyzer = VoiceEmotionAnalyzer()

@router.post("/detect/audio")
async def detect_audio(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        filename = getattr(file, "filename", "recording.wav")
        ext = os.path.splitext(filename)[1].lower() or ".wav"
        
        # 1. Spool to temp disk
        temp_incoming = tempfile.NamedTemporaryFile(delete=False, suffix=ext, mode="wb")
        try:
            temp_incoming.write(contents)
            incoming_path = temp_incoming.name
        finally:
            temp_incoming.close() # CRITICAL: Release handle on Windows before librosa uses it
            
        print(f"[AUDIO] Ingested file: {filename} ({len(contents)} bytes)")
        
        try:
            # Direct librosa load (Now works for Live Recording because frontend sends true PCM WAV)
            result = await asyncio.to_thread(analyzer.predict_emotion, incoming_path)
            
            if "error" in result:
                return {"error": result["error"]}
                
            return {
                "emotion": result["emotion"],
                "confidence": result["confidence"],
                "metrics": result.get("metrics"),
                "timestamp": time.time()
            }
                
        finally:
            if os.path.exists(incoming_path): os.remove(incoming_path)
            
    except Exception as e:
        traceback.print_exc()
        return {"error": f"Critical ingestion failure: {str(e)}"}
