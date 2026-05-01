import torch
from transformers import pipeline

class SpeechToTextService:
    def __init__(self, model_id="openai/whisper-tiny.en"):
        # Local instance of OpenAI Whisper
        print(f"[AI] Loading local STT Model: {model_id}")
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        try:
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model=model_id,
                chunk_length_s=30,
                device=device,
            )
        except Exception as e:
            print(f"[AI] Could not load whisper model (using mock fallback): {e}")
            self.pipe = None

    def transcribe(self, file_path):
        if not self.pipe:
            # Fallback for fast dev/mock if model not downloaded
            return {"text": "I am trying to say...", "transcription_progress": 0.0}
            
        try:
            result = self.pipe(file_path)
            # Rough proxy for transcription progress based on result availability
            transcription_progress = 1.0 if result["text"] else 0.0
            return {
                "text": result["text"].strip(),
                "transcription_progress": transcription_progress
            }
        except Exception as e:
            print(f"STT Error: {e}")
            # Simulated 0% transcription progress (stuck state)
            return {"text": "", "transcription_progress": 0.0}
