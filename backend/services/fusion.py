class MultimodalFusionEngine:
    def __init__(self, face_weight=0.65, voice_weight=0.35):
        self.face_weight = face_weight
        self.voice_weight = voice_weight

    def fuse(self, face_result, voice_result, pose_result=None, stt_result=None):
        # Handle missing modalities elegantly
        if face_result and not voice_result:
            return {**face_result, "fusion_mode": "face_only"}
        if voice_result and not face_result:
            return {**voice_result, "fusion_mode": "voice_only"}
        if not face_result and not voice_result:
            return {"emotion": "neutral", "confidence": 0.0, "fusion_mode": "empty"}

        f_emo = face_result.get("emotion", face_result.get("dominant_emotion", "neutral"))
        f_conf = face_result.get("confidence", face_result.get("emotion_confidence", 0.0))
        
        v_emo = voice_result.get("emotion", "neutral")
        v_conf = voice_result.get("confidence", 0.0)
        v_metrics = voice_result.get("metrics", {})
        
        # Check Elite Fusion Trigger: "Speech Friction Event"
        # Logic: Acoustic_Energy_Spike + Facial_Tension + 0%_Transcription_Progress
        trigger_word_prediction = False
        
        transcription_progress = stt_result.get("transcription_progress", 1.0) if stt_result else 1.0
        
        is_acoustic_spike = v_metrics.get("energy", 0) > 0.08 or v_metrics.get("jitter", 0) > 0.05
        is_facial_tension = f_emo in ["angry", "subtle_stress", "fear"] or (pose_result and pose_result.get("metrics", {}).get("pose_stress_level", 0) > 0.6)
        
        if is_acoustic_spike and is_facial_tension and transcription_progress <= 0.1:
            trigger_word_prediction = True
            print("[AI] ⚡ Elite Fusion Trigger: SPEECH FRICTION EVENT DETECTED ⚡")
        
        # Base fusion logic
        final_result = {}
        if f_emo == v_emo:
            # Synergistic boost
            final_result = {
                "emotion": f_emo,
                "confidence": min(1.0, (f_conf * self.face_weight) + (v_conf * self.voice_weight) + 0.15),
                "fusion_mode": "synergistic"
            }
        else:
            # Conflict resolution based on statistically weighted confidence matrices
            f_score = f_conf * self.face_weight
            v_score = v_conf * self.voice_weight
            
            if f_score >= v_score:
                final_result = {
                    "emotion": f_emo,
                    "confidence": f_score,
                    "fusion_mode": "face_dominant"
                }
            else:
                final_result = {
                    "emotion": v_emo,
                    "confidence": v_score,
                    "fusion_mode": "voice_dominant"
                }
                
        # Inject the trigger payload
        final_result["trigger_word_prediction"] = trigger_word_prediction
        return final_result
