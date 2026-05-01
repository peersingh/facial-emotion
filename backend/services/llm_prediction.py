import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

class ContextualWordPredictor:
    def __init__(self, model_id="gpt2"):
        # Deploy lightweight Transformer model
        print(f"[AI] Loading Contextual LLM: {model_id} (Simulating ASDBank Fine-tuning)")
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(model_id)
            self.model = AutoModelForCausalLM.from_pretrained(model_id).to(self.device)
        except Exception as e:
            print(f"[AI] Could not load LLM (using mock fallback): {e}")
            self.model = None
            self.tokenizer = None

    def predict_next_words(self, context_text, top_k=3):
        if not self.model or not context_text.strip():
            # Mock fallback based on TalkBank ASDBank logic
            return ["water", "help", "break"]
            
        try:
            # Analyze last 3-5 spoken words
            words = context_text.split()
            last_words = " ".join(words[-5:])
            
            inputs = self.tokenizer(last_words, return_tensors="pt").to(self.device)
            with torch.no_grad():
                outputs = self.model(**inputs)
                
            next_token_logits = outputs.logits[0, -1, :]
            top_k_indices = torch.topk(next_token_logits, top_k).indices.tolist()
            
            predictions = [self.tokenizer.decode([idx]).strip() for idx in top_k_indices]
            # Clean up predictions (remove punctuation, lower)
            cleaned = [p.lower() for p in predictions if p.isalpha()]
            
            # Ensure we have 3 results
            fallbacks = ["water", "help", "break"]
            while len(cleaned) < top_k:
                cleaned.append(fallbacks.pop(0))
                
            return cleaned[:top_k]
        except Exception as e:
            print(f"Prediction Error: {e}")
            return ["water", "help", "break"]
