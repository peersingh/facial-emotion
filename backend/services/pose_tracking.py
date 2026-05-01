import cv2
import mediapipe as mp
import numpy as np
from collections import deque

class PoseTracker:
    def __init__(self):
        self.mp_holistic = mp.solutions.holistic
        self.holistic = self.mp_holistic.Holistic(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.history_size = 10
        self.left_hand_history = deque(maxlen=self.history_size)
        self.right_hand_history = deque(maxlen=self.history_size)

    def process_frame(self, frame):
        image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.holistic.process(image_rgb)
        
        metrics = {
            "shoulder_elevation": 0.0,
            "hand_fidgeting": 0.0,
            "head_orientation": 0.0,
            "pose_stress_level": 0.0
        }
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Shoulder Elevation (Tension)
            left_shoulder = landmarks[self.mp_holistic.PoseLandmark.LEFT_SHOULDER.value]
            right_shoulder = landmarks[self.mp_holistic.PoseLandmark.RIGHT_SHOULDER.value]
            # Lower y means higher shoulder elevation
            shoulder_y = (left_shoulder.y + right_shoulder.y) / 2
            metrics["shoulder_elevation"] = max(0, 1.0 - shoulder_y) # Normalized heuristic
            
            # Head Orientation (Engagement)
            nose = landmarks[self.mp_holistic.PoseLandmark.NOSE.value]
            # Deviation from center (0.5, 0.5)
            head_deviation = np.sqrt((nose.x - 0.5)**2 + (nose.y - 0.5)**2)
            metrics["head_orientation"] = max(0, 1.0 - head_deviation * 2) # 1.0 is looking straight
            
        # Hand Fidgeting (Stimming)
        # Calculate amount of hand movement across recent frames
        fidget_score = 0.0
        
        left_center = self._get_hand_center(results.left_hand_landmarks)
        if left_center:
            self.left_hand_history.append(left_center)
            fidget_score += self._calculate_movement(self.left_hand_history)
            
        right_center = self._get_hand_center(results.right_hand_landmarks)
        if right_center:
            self.right_hand_history.append(right_center)
            fidget_score += self._calculate_movement(self.right_hand_history)
            
        # Scale movement to a 0-1 metric
        metrics["hand_fidgeting"] = min(1.0, fidget_score * 15.0)
        
        # Calculate overall pose stress level
        # High shoulder elevation and high hand fidgeting -> High stress
        metrics["pose_stress_level"] = (metrics["shoulder_elevation"] * 0.6) + (metrics["hand_fidgeting"] * 0.4)
        
        return {
            "metrics": metrics,
            "results": results
        }
        
    def _get_hand_center(self, hand_landmarks):
        if not hand_landmarks:
            return None
        x = np.mean([lm.x for lm in hand_landmarks.landmark])
        y = np.mean([lm.y for lm in hand_landmarks.landmark])
        return (x, y)
        
    def _calculate_movement(self, history):
        if len(history) < 2:
            return 0.0
        movement = 0.0
        for i in range(1, len(history)):
            prev = history[i-1]
            curr = history[i]
            dist = np.sqrt((curr[0] - prev[0])**2 + (curr[1] - prev[1])**2)
            movement += dist
        return movement / (len(history) - 1)
        
    def draw_annotations(self, image, results):
        if results.face_landmarks:
            self.mp_drawing.draw_landmarks(
                image, results.face_landmarks, self.mp_holistic.FACEMESH_TESSELATION,
                self.mp_drawing.DrawingSpec(color=(80,110,10), thickness=1, circle_radius=1),
                self.mp_drawing.DrawingSpec(color=(80,256,121), thickness=1, circle_radius=1)
            )
        if results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                image, results.pose_landmarks, self.mp_holistic.POSE_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4),
                self.mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
            )
        if results.left_hand_landmarks:
            self.mp_drawing.draw_landmarks(
                image, results.left_hand_landmarks, self.mp_holistic.HAND_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(121,22,76), thickness=2, circle_radius=4),
                self.mp_drawing.DrawingSpec(color=(121,44,250), thickness=2, circle_radius=2)
            )
        if results.right_hand_landmarks:
            self.mp_drawing.draw_landmarks(
                image, results.right_hand_landmarks, self.mp_holistic.HAND_CONNECTIONS,
                self.mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=4),
                self.mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
            )
        return image
