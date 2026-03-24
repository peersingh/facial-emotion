import json
import os
from datetime import datetime

class EmotionLogger:
    def __init__(self, log_dir="data/sessions"):
        self.log_dir = log_dir
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir)
            
        self.session_id = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.log_file = os.path.join(self.log_dir, f"session_{self.session_id}.json")
        self.logs = []
        
    def log_event(self, emotion, confidence, source="face"):
        event = {
            "timestamp": datetime.now().isoformat(),
            "emotion": emotion,
            "confidence": round(confidence, 4),
            "source": source
        }
        self.logs.append(event)
        
        # Dump to disk periodically
        if len(self.logs) % 10 == 0:
            with open(self.log_file, "w") as f:
                json.dump(self.logs, f, indent=4)
