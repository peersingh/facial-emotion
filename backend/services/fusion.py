class MultimodalFusionEngine:
    def __init__(self, face_weight=0.65, voice_weight=0.35):
        self.face_weight = face_weight
        self.voice_weight = voice_weight

    def fuse(self, face_result, voice_result):
        # Handle missing modalities elegantly
        if face_result and not voice_result:
            return {**face_result, "fusion_mode": "face_only"}
        if voice_result and not face_result:
            return {**voice_result, "fusion_mode": "voice_only"}
        if not face_result and not voice_result:
            return {"emotion": "neutral", "confidence": 0.0, "fusion_mode": "empty"}

        f_emo = face_result.get("emotion", "neutral")
        f_conf = face_result.get("confidence", 0.0)
        
        v_emo = voice_result.get("emotion", "neutral")
        v_conf = voice_result.get("confidence", 0.0)
        
        if f_emo == v_emo:
            # Synergistic boost
            return {
                "emotion": f_emo,
                "confidence": min(1.0, (f_conf * self.face_weight) + (v_conf * self.voice_weight) + 0.15),
                "fusion_mode": "synergistic"
            }
            
        # Conflict resolution based on statistically weighted confidence matrices
        f_score = f_conf * self.face_weight
        v_score = v_conf * self.voice_weight
        
        if f_score >= v_score:
            return {
                "emotion": f_emo,
                "confidence": f_score,
                "fusion_mode": "face_dominant"
            }
        else:
            return {
                "emotion": v_emo,
                "confidence": v_score,
                "fusion_mode": "voice_dominant"
            }
