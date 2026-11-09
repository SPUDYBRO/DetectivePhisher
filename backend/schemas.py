from pydantic import BaseModel, Field
from typing import Literal


class PredictRequest(BaseModel):
    url: str = Field(
        min_length=1,
        max_length=2048,
        description="The URL to check",
        examples=["https://example.com/login", "http://example.com", "example.com/login"]
    )
    
class PredictResponse(BaseModel):
    verdict: Literal["phishing", "legitimate"] = Field(
        description="If the URL is predicted to be phishing or legitimate",
        examples=["phishing", "legitimate"]
    )
    confidence: float = Field(
        description="How sure the model is of its prediction from 0 to 1 (1 being very sure)",
        ge=0, #min
        le=1 #max
    )
    phishing_probability: float = Field(
        description="The raw score to build the graph",
        ge=0, #min
        le=1 #max
    )
    reasons: list[str] = Field(
        description="The red flags the model has pointed out"
    )
    features: dict[str, float] = Field(
        description="All the features the model was given, used for graph"
    )
    feature_zscores: dict[str, float] = Field(
        description="This URL's features scaled onto the same axis as /api/feature-averages, used by the feature average graph"
    )

class FeatureAveragePoint(BaseModel):
    key: str = Field(
        description="The feature name, matching the keys in PredictResponse.features"
    )
    label: str = Field(
        description="A human readable label for the feature, used as the graph's x-axis tick"
    )
    legitimate: float = Field(
        description="The average value of this feature across legitimate URLs, scaled to a z-score"
    )
    phishing: float = Field(
        description="The average value of this feature across phishing URLs, scaled to a z-score"
    )

class FeatureAverageResponse(BaseModel):
    features: list[FeatureAveragePoint] = Field(
        description="One point per feature, in model order, for the feature average graph"
    )

class HealthResponse(BaseModel):
    status: Literal["online"] = Field(
        default="online",
        description="The connection to the server was successful and the backend is ready to respond"
    )
    model_status: bool = Field(
        default=False,
        description="Boolean details of if the model is ready to use or not"
    )
    model_state: Literal["Ready", "Loading", "Failed"] = Field(
        default="Loading",
        description="A single word human readable state of if the model is ready to use or not"
    )
    model_state_description: str = Field(
        description="A human readable, 1 sentence long, message describing model_state"
    )