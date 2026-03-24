import os
import time
from fastapi import APIRouter, UploadFile, File
import tempfile

from backend.services.voice_emotion import VoiceEmotionAnalyzer

router = APIRouter(tags=["Audio Analysis"])
analyzer = VoiceEmotionAnalyzer()

@router.post("/detect/audio")
async def detect_audio(file: UploadFile = File(...)):
    # librosa.load requires a physical filepath, so we spool uploading streams to temp disk
    try:
        contents = await file.read()
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".wav"
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode="wb") as temp_audio:
            temp_audio.write(contents)
            temp_filepath = temp_audio.name
            
        result = analyzer.predict_emotion(temp_filepath)
        
        # Cleanup
        os.remove(temp_filepath)
        
        if "error" in result:
            return {"error": result["error"]}
            
        return {
            "emotion": result["emotion"],
            "confidence": result["confidence"],
            "metrics": result.get("metrics"),
            "timestamp": time.time()
        }
        
    except Exception as e:
        return {"error": f"Failed to ingest audio buffer: {str(e)}"}
