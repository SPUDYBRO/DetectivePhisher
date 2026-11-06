from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from train_modules import predict_url

app = FastAPI(title="DetectivePhisher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class URLCheckRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)


@app.get("/api/health")
def health():
    return {"status": "online"}


@app.post("/api/check-url")
def check_url(payload: URLCheckRequest):
    result = predict_url(payload.url)
    if result is None:
        raise HTTPException(status_code=400, detail="That doesn't look like a valid URL.")
    return result