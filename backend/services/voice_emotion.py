import librosa
import numpy as np

class VoiceEmotionAnalyzer:
    def __init__(self):
        # Map acoustic boundaries to standard 7 MEIP state variables
        self.emotions = ["angry", "sad", "happy", "fear", "surprise", "disgust", "neutral"]

    def extract_features(self, file_path):
        # Extract MFCC, Spectral Centroid, and RMS Energy uniformly
        y, sr = librosa.load(file_path, sr=22050)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        rms = librosa.feature.rms(y=y)
        centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
        
        return {
            "mfcc_mean": np.mean(mfcc.T, axis=0),
            "energy_mean": np.mean(rms),
            "pitch_mean": np.mean(centroid)
        }

    def predict_emotion(self, file_path):
        """
        Computes acoustic energy and spectral centroid features 
        to infer emotion via heuristic classifier matrix.
        """
        try:
            features = self.extract_features(file_path)
            
            energy = features["energy_mean"]
            pitch = features["pitch_mean"]
            
            if energy > 0.05 and pitch > 2000:
                emotion, conf = "angry", 0.85
            elif energy > 0.03 and pitch > 1500:
                emotion, conf = "happy", 0.80
            elif energy > 0.04 and pitch > 3000:
                emotion, conf = "surprise", 0.75
            elif energy < 0.015 and pitch < 1000:
                emotion, conf = "sad", 0.82
            elif energy < 0.02 and pitch > 1500:
                emotion, conf = "fear", 0.65
            elif pitch < 800 and energy > 0.02:
                emotion, conf = "disgust", 0.60
            else:
                emotion, conf = "neutral", 0.70
                
            return {
                "emotion": emotion,
                "confidence": float(conf),
                "features_extracted": True,
                "metrics": {
                    "energy": float(energy),
                    "pitch": float(pitch)
                }
            }
        except Exception as e:
            print(f"Voice extraction error: {e}")
            return {"emotion": "neutral", "confidence": 0.0, "error": str(e)}
