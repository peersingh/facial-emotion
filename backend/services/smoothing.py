from collections import deque
import time

class EmotionStateTracker:
    def __init__(self, history_size=5, confidence_threshold=0.4, state_duration_sec=1.5):
        # Deque naturally drops oldest predictions when maxlen is reached
        self.history = deque(maxlen=history_size)
        self.confidence_threshold = confidence_threshold
        self.state_duration_sec = state_duration_sec
        
        self.current_smoothed_emotion = "neutral"
        self.emotion_start_time = time.time()
        self.current_state = "Calm"
        
        # Insight mapping
        self.state_map = {
            "angry": "Frustrated",
            "sad": "Depressed/Down",
            "happy": "Joyful",
            "fear": "Anxious",
            "surprise": "Shocked",
            "disgust": "Disgusted",
            "neutral": "Calm",
            "subtle_stress": "Tense"
        }
        
    def process_prediction(self, emotion_label, confidence):
        """
        Smooths predictions and tracks long-term state.
        confidence should be between 0.0 and 1.0.
        Returns: (smoothed_emotion, insight_state)
        """
        # 1. Confidence Filtering
        if confidence < self.confidence_threshold:
            return self._evaluate_state()
            
        self.history.append(emotion_label)
        return self._evaluate_state()
        
    def _evaluate_state(self):
        # 2. Majority Vote Smoothing
        if not self.history:
            return self.current_smoothed_emotion, self.current_state
            
        majority_emotion = max(set(self.history), key=self.history.count)
        
        # 3. State tracking
        current_time = time.time()
        
        if majority_emotion != self.current_smoothed_emotion:
            self.current_smoothed_emotion = majority_emotion
            self.emotion_start_time = current_time
            self.current_state = "Transitioning..."
        else:
            elapsed = current_time - self.emotion_start_time
            if elapsed >= self.state_duration_sec:
                self.current_state = self.state_map.get(majority_emotion, majority_emotion)
            else:
                self.current_state = f"Stable {majority_emotion}"
                
        return self.current_smoothed_emotion, self.current_state
