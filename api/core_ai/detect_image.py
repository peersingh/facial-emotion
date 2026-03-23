import cv2
import argparse
from emotion_detector import EmotionDetector

def main():
    parser = argparse.ArgumentParser(description="Detect emotion in an image")
    parser.add_argument("image_path", help="Path to the image file")
    parser.add_argument("--output", help="Path to save the annotated image", default="output.jpg")
    args = parser.parse_args()
    
    detector = EmotionDetector()
    img = cv2.imread(args.image_path)
    if img is None:
        print(f"Could not load image at {args.image_path}")
        return
        
    print("Running emotion detection...")
    results = detector.detect_emotion(img)
    print("Detected Results:", results)
    
    annotated_img = detector.draw_annotations(img, results)
    
    if args.output:
        cv2.imwrite(args.output, annotated_img)
        print(f"Saved output to {args.output}")

if __name__ == "__main__":
    main()
