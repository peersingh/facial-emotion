import cv2
import numpy as np
import scipy.io.wavfile as wavfile
import os
from fastapi.testclient import TestClient

# Import the main app instance
from backend.main import app

def create_dummy_image(path="dummy_image.jpg"):
    # Create a simple 640x480 green image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (0, 255, 0)
    cv2.imwrite(path, img)
    return path

def create_dummy_audio(path="dummy_audio.wav"):
    # Create 1 second of random noise (simulating audio)
    sample_rate = 22050
    t = np.linspace(0, 1, sample_rate)
    # Generate some sine wave and noise to trigger acoustic features
    audio_data = np.sin(2 * np.pi * 440 * t) + np.random.normal(0, 0.5, sample_rate)
    audio_data = np.int16(audio_data / np.max(np.abs(audio_data)) * 32767)
    wavfile.write(path, sample_rate, audio_data)
    return path

def test_fusion_endpoint():
    print("Initializing TestClient...")
    client = TestClient(app)
    
    print("Creating dummy assets...")
    img_path = create_dummy_image()
    audio_path = create_dummy_audio()
    
    print("Testing /detect/fusion endpoint...")
    try:
        with open(img_path, "rb") as img_file, open(audio_path, "rb") as audio_file:
            response = client.post(
                "/detect/fusion",
                files={
                    "image": ("dummy_image.jpg", img_file, "image/jpeg"),
                    "audio": ("dummy_audio.wav", audio_file, "audio/wav")
                }
            )
            
        print("\n=== Test Results ===")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            import json
            print("Response JSON:")
            print(json.dumps(response.json(), indent=2))
        else:
            print("Error Details:", response.text)
            
    finally:
        # Cleanup
        if os.path.exists(img_path):
            os.remove(img_path)
        if os.path.exists(audio_path):
            os.remove(audio_path)

if __name__ == "__main__":
    test_fusion_endpoint()
