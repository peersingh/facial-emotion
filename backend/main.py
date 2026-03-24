import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.emotion import router as emotion_router
from backend.routes.audio import router as audio_router
from backend.routes.fusion import router as fusion_router
from backend.routes.analytics import router as analytics_router

app = FastAPI(title="Multimodal Emotion Intelligence Platform (MEIP)", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(emotion_router, prefix="/api/v1")
app.include_router(audio_router, prefix="/api/v1")
app.include_router(fusion_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {
        "status": "Operational", 
        "modules": ["face_emotion_v2", "state_smoothing_v1"]
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8080, reload=True)
