from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from schemas import PredictRequest, PredictResponse, HealthResponse
from validation import validate_url
from features import extract_features, features_dict_to_ordered_list, FEATURE_COLUMNS
from prediction import make_prediction
from train import MODEL_PATH
import logging
from train import main as train
import joblib
import threading


app = FastAPI(title="DetectivePhisher API")

# Only our own front end may call this API from a browser. Vite's dev server runs on 5173;
# "npm run build" + "npm run preview" (used to check the production build) serves it on 4173.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Handles anything missed. This ensures that we (the developers) can see traceback to understand and fix the error
    While users are given the generic something went wrong error

    Returns:
        JSONResponse: A generic error 500
    """
    logging.getLogger("uvicorn.error").exception("Unhandled error while processing request")
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again later."},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_err = exc.errors()[0]
    
    field = "request body"
    
    for part in first_err["loc"]:
        if isinstance(part, str) and part != "body":
            field = part
    
    message = f"Invalid {field}: {first_err['msg']}"
        
    return JSONResponse(
        status_code=422,
        content={"detail": message}
    )



model = {
    "state": "Loading",
    "model": None,
    "message": "Currently loading the model",
}




def server_prechecks():
    """Runs essential checks when the server launches
    Checks include:
    - Checks if A model is pre-trained
    - Will train a new model if no model was pretrained
    - Loads The model
    """
    logger = logging.getLogger("uvicorn.error")
    if MODEL_PATH.is_file():
        logger.info("AI Model already exists, Loading...")
        model["state"] = "Loading"
        model["message"] = "Currently loading the model"
        
        
    else:
        logger.warning("No Model was pre-trained. Running Trainer...")
        
        try:
            result = train()
        except Exception as error:
            logger.error(f"Something went wrong: {error}")
            model["state"] = "Failed"
            model["message"] = "The model failed to load"
            return
        
        
        if not result.success:
            logger.error(result.message)
            model["state"] = "Failed"
            model["message"] = "The model failed to load"
            return
            
            
        logger.info("Model successfully trained")
        
        
        
    logger.info("Now Loading Model")
    try:
        bundle = joblib.load(MODEL_PATH)
        if bundle["feature_columns"] != FEATURE_COLUMNS:
            raise Exception("The model that was loaded didn't match the feature columns that are required.")
        model["model"] = bundle["model"]
    except Exception as error:
        logger.error(f"Failed to load model: {error}")
        model["state"] = "Failed"
        model["message"] = "The model failed to load"
        return
    model["state"] = "Ready"
    model["message"] = "The model is loaded and ready to use"
    logger.info("Successfully loaded model and is now ready to use")
    
    return
        
    
    
      
      
      
        

@app.get("/api/health", response_model=HealthResponse, summary="Front-end connectivity check", description="Responds with online for frontend connectivity check. Also response with model loading state and if its ready or not")
def health():
    
    if model["state"] == "Loading":
        model_status = False
        model_state_description = model["message"]
    elif model["state"] == "Ready":
        model_status = True
        model_state_description = model["message"]
    else:
        model_status = False
        model_state_description = model["message"]
    
    return HealthResponse(
        model_status=model_status,
        model_state=model["state"],
        model_state_description=model_state_description
    )



@app.post("/api/predict", response_model=PredictResponse, summary="Check a URL", description="Takes a URL and returns if it looks like its a phishing link or a legitimate link based off its features")
def predict(data: PredictRequest):

    # Input handling and extraction
    url = validate_url(data.url)

    features = extract_features(url)
    ordered_features = features_dict_to_ordered_list(features)

    return make_prediction(model, features, ordered_features)



worker = threading.Thread(target=server_prechecks, name="Trainer", daemon=True)
worker.start()