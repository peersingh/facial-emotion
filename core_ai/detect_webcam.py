import cv2
from emotion_detector import EmotionDetector
from state_tracker import EmotionStateTracker

def main():
    detector = EmotionDetector()
    tracker = EmotionStateTracker()
    cap = cv2.VideoCapture(0)
    
    print("Starting webcam. Press 'q' to quit.")
    
    # We might want to run detection every N frames to avoid lagging
    frame_count = 0
    process_every_n_frames = 5
    last_results = []
    current_global_state = "Calm"
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame.")
            break
            
        frame_count += 1
        
        # Only analyze every N frames, otherwise use cached results
        if frame_count % process_every_n_frames == 0:
            last_results = detector.detect_emotion(frame)
            
            if last_results and 'dominant_emotion' in last_results[0]:
                face = last_results[0]
                smoothed, state = tracker.process_prediction(face['dominant_emotion'], face.get('emotion_confidence', 1.0))
                face['dominant_emotion'] = smoothed
                current_global_state = state
            else:
                _, current_global_state = tracker._evaluate_state()
            
        # Draw on frame
        annotated_frame = detector.draw_annotations(frame, last_results)
        
        # Draw the long-term state at the top of the frame
        cv2.putText(annotated_frame, f"Insight: {current_global_state}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 165, 255), 2)
        
        cv2.imshow("Webcam Emotion Detection", annotated_frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
