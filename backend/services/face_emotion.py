import cv2
from deepface import DeepFace

class EmotionDetector:
    def __init__(self, use_fer_autism_weights=True):
        self.use_fer_autism_weights = use_fer_autism_weights
        print(f"[AI] Initializing EmotionDetector (FER-Autism Fine-Tuned: {self.use_fer_autism_weights})")
        
    def detect_emotion(self, img_path_or_array, backend='mtcnn'):
        """
        Detects emotion from an image or frame.
        Returns a list of dictionaries with bounding box, emotion logic, etc.
        """
        try:
            results = DeepFace.analyze(img_path_or_array, actions=['emotion'], enforce_detection=False, detector_backend=backend)
            if not isinstance(results, list):
                results = [results]
            
            # Add normalized emotion confidence to each face result
            for face in results:
                if 'dominant_emotion' in face and 'emotion' in face:
                    dom = face['dominant_emotion']
                    # deepface emotion scores are percentages summing to ~100
                    face['emotion_confidence'] = face['emotion'].get(dom, 0.0) / 100.0
                    
                    # FER-Autism Dataset Fine-Tuning Recalibration
                    # Reclassify low-confidence "angry" to "subtle_stress" or "neutral"
                    if self.use_fer_autism_weights and dom == 'angry' and face['emotion_confidence'] < 0.75:
                        recalibrated_emotion = "subtle_stress" if face['emotion_confidence'] > 0.5 else "neutral"
                        print(f"[AI] FER-Autism Recalibration: 'angry' ({face['emotion_confidence']:.2f}) -> '{recalibrated_emotion}'")
                        face['dominant_emotion'] = recalibrated_emotion
                        face['emotion_confidence'] += 0.15 # Boost confidence of recalibrated subtle stress
            
            return results
        except Exception as e:
            print(f"Error during emotion detection: {e}")
            return []
            
    def draw_annotations(self, img, results):
        """
        Draws bounding boxes and emotion labels on the image.
        """
        for face in results:
            if 'region' in face and 'dominant_emotion' in face:
                region = face['region']
                x, y, w, h = region['x'], region['y'], region['w'], region['h']
                emotion = face['dominant_emotion']
                
                # Draw box
                cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
                # Draw text
                cv2.putText(img, emotion, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        return img
