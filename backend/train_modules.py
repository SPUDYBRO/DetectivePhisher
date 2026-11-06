"""Trains and serves the phishing URL classifier used by main.py.

train_model() loads the two labelled datasets in backend/data (a raw url/type dataset
and a dataset that already has features.py-style columns precomputed), turns them both
into the same feature vectors the live app will use, and fits a DecisionTreeClassifier
on the combined data. The trained model is cached to backend/models/phishing.joblib so
it only needs to be trained once (it is retrained automatically if the file is missing
or unreadable).
"""
from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

from features import FEATURE_COLUMNS, get_url_features, vectorize_features

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
MODEL_PATH = MODEL_DIR / "phishing.joblib"

# Raw url/type dataset: features aren't precomputed, so get_url_features() runs per row.
RAW_URL_DATASET_PATH = DATA_DIR / "corrected_phishing_dataset.csv"
# Already-featurised dataset: has the same columns as FEATURE_COLUMNS, so it's just loaded.
PROCESSED_DATASET_PATH = DATA_DIR / "processed Dataset2.csv"

RANDOM_SEED = 42
MAX_DEPTH = 12            # kept shallow enough to stay readable/explainable as a decision tree
MALICIOUS_CUTOFF = 0.66   # probability_malicious at/above this -> "malicious"
CAUTION_CUTOFF = 0.33     # probability_malicious at/above this -> "caution"

_model_cache = None   # loaded lazily so importing this module doesn't train a model


def _load_raw_url_dataset(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Loads a url,type csv and runs every url through features.py to vectorize it."""
    df = pd.read_csv(path)

    rows, labels = [], []
    for url, label_type in zip(df["url"], df["type"]):
        features = get_url_features(url)
        if features is None:
            continue
        rows.append(vectorize_features(features))
        labels.append(0 if label_type == "benign" else 1)

    X = np.array(rows, dtype=np.float32)
    y = np.array(labels, dtype=np.int8)
    return X, y


def _load_processed_dataset(path: Path) -> tuple[np.ndarray, np.ndarray]:
    """Loads a csv that already has FEATURE_COLUMNS computed, in the same column order."""
    df = pd.read_csv(path, usecols=["type", *FEATURE_COLUMNS])

    # Mirrors vectorize_features(): booleans -> 0/1, missing values -> 0.5, else the raw number.
    columns = [df[column].astype("float32").fillna(0.5).to_numpy() for column in FEATURE_COLUMNS]
    X = np.column_stack(columns).astype(np.float32)
    y = (df["type"] != "benign").astype(np.int8).to_numpy()
    return X, y


def _load_training_data() -> tuple[np.ndarray, np.ndarray]:
    """Loads and combines every dataset in backend/data into one feature matrix/label vector."""
    X_raw, y_raw = _load_raw_url_dataset(RAW_URL_DATASET_PATH)
    X_processed, y_processed = _load_processed_dataset(PROCESSED_DATASET_PATH)

    X = np.vstack([X_raw, X_processed])
    y = np.concatenate([y_raw, y_processed])
    return X, y


def train_model() -> tuple[DecisionTreeClassifier, dict]:
    """Loads the datasets, trains the classifier, caches it to disk, and returns it."""
    X, y = _load_training_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_SEED, stratify=y
    )

    model = DecisionTreeClassifier(max_depth=MAX_DEPTH, random_state=RANDOM_SEED)
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 3),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 3),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 3),
        "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 3),
    }

    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump({"model": model, "feature_columns": FEATURE_COLUMNS, "metrics": metrics}, MODEL_PATH)

    return model, metrics


def _load_model() -> DecisionTreeClassifier:
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    if MODEL_PATH.exists():
        try:
            bundle = joblib.load(MODEL_PATH)
            if bundle.get("feature_columns") == FEATURE_COLUMNS:
                _model_cache = bundle["model"]
                return _model_cache
        except Exception:
            pass   # fall through and retrain if the cached model is missing/stale/corrupt

    _model_cache, _ = train_model()
    return _model_cache


def _build_report(features: dict) -> list[str]:
    """Turns the raw feature values into plain-English reasons for the verdict."""
    report = []

    if features["has_ip"]:
        report.append("The address uses a raw IP instead of a domain name, a common phishing trick.")

    if features["has_https"] == 0:
        report.append("The link does not use HTTPS encryption.")
    elif features["has_https"] != features["has_https"]:   # NaN: no scheme was given at all
        report.append("No http:// or https:// was specified, so the connection security is unknown.")

    if features["has_at_symbol"]:
        report.append("The URL contains an '@' symbol, which can be used to hide the real destination.")

    if features["host_hyphens"] >= 2:
        report.append("The domain contains multiple hyphens, often used to imitate a trusted brand.")

    if features["domain_length"] >= 30:
        report.append("The domain name is unusually long.")

    if features["num_dots"] >= 4:
        report.append("The URL has an unusually high number of dots/subdomains, which can disguise the true domain.")

    if not report:
        report.append("No obvious red flags were found in the URL's structure.")

    return report


def predict_url(url: str) -> dict | None:
    """Runs a URL through feature extraction and the trained model.

    Args:
        url (str): The URL to check

    Returns:
        dict | None: {"verdict", "trustScore", "report"}, or None if the url is invalid/empty
    """
    features = get_url_features(url)
    if features is None:
        return None

    model = _load_model()
    vector = np.array([vectorize_features(features)])
    probability_malicious = float(model.predict_proba(vector)[0][1])
    trust_score = round(1 - probability_malicious, 2)

    if probability_malicious >= MALICIOUS_CUTOFF:
        verdict = "malicious"
    elif probability_malicious >= CAUTION_CUTOFF:
        verdict = "caution"
    else:
        verdict = "benign"

    return {
        "verdict": verdict,
        "trustScore": trust_score,
        "report": _build_report(features),
    }


if __name__ == "__main__":
    _, trained_metrics = train_model()
    print("Trained phishing model. Test metrics:", trained_metrics)
