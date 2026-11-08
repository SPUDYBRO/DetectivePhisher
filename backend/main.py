from fastapi import FastAPI
from schemas import PredictRequest, PredictResponse, HealthResponse
from validation import validate_url
from features import extract_features, features_dict_to_ordered_list, FEATURE_COLUMNS
from prediction import make_prediction
from train import MODEL_PATH


app = FastAPI(title="DetectivePhisher API")



@app.get("/api/health", response_model=HealthResponse, summary="Front-end connectivity check", description="Used by the front-end to identify if it is able to connect to the server or not")
def health():
    return HealthResponse(status="online")



@app.post("/api/predict", response_model=PredictResponse, summary="Check a URL", description="Takes a URL and returns if it looks like its a phishing link or a legitimate link based off its features")
def predict(data: PredictRequest):

    # Input handling and extraction
    url = validate_url(data.url)

    features = extract_features(url)
    ordered_features = features_dict_to_ordered_list(features)

    return make_prediction(features, ordered_features)