"""Reference numbers for the "feature average" comparison chart.

These are representative placeholder statistics (not computed live from the
training data) describing, for each feature the model uses, the overall mean
and standard deviation across the dataset, plus the average value seen in
legitimate and phishing URLs. Every value is scaled to a z-score (how many
standard deviations from the dataset average) so legitimate URLs, phishing
URLs and a single checked URL can all be plotted on the same axis.
"""

from features import FEATURE_COLUMNS

FEATURE_LABELS = {
    "num_dots": "Number of dots",
    "num_hyphens": "Number of hyphens",
    "host_hyphens": "Number of root hyphens",
    "domain_length": "Domain length",
    "has_https": "Has HTTPS",
    "has_ip": "Has IP address",
    "has_at_symbol": "Has '@' symbol",
}

# mean/std describe the whole dataset; legitimate_mean/phishing_mean describe each class.
FEATURE_STATS = {
    "num_dots": {"mean": 2.6, "std": 1.3, "legitimate_mean": 2.1, "phishing_mean": 3.4},
    "num_hyphens": {"mean": 0.9, "std": 1.1, "legitimate_mean": 0.4, "phishing_mean": 1.8},
    "host_hyphens": {"mean": 0.5, "std": 0.8, "legitimate_mean": 0.2, "phishing_mean": 1.1},
    "domain_length": {"mean": 17.0, "std": 6.0, "legitimate_mean": 14.0, "phishing_mean": 22.0},
    "has_https": {"mean": 0.63, "std": 0.30, "legitimate_mean": 0.85, "phishing_mean": 0.35},
    "has_ip": {"mean": 0.05, "std": 0.10, "legitimate_mean": 0.01, "phishing_mean": 0.12},
    "has_at_symbol": {"mean": 0.04, "std": 0.10, "legitimate_mean": 0.02, "phishing_mean": 0.08},
}


def zscore(value: float, mean: float, std: float) -> float:
    """Scales a raw feature value onto the same axis as the comparison chart."""
    if std == 0:
        return 0.0
    return (value - mean) / std


def feature_average_chart_points() -> list[dict]:
    """One point per feature, in model order, for the legitimate/phishing comparison lines."""
    points = []
    for column in FEATURE_COLUMNS:
        stats = FEATURE_STATS[column]
        points.append({
            "key": column,
            "label": FEATURE_LABELS[column],
            "legitimate": zscore(stats["legitimate_mean"], stats["mean"], stats["std"]),
            "phishing": zscore(stats["phishing_mean"], stats["mean"], stats["std"]),
        })
    return points


def feature_zscores(features: dict[str, float]) -> dict[str, float]:
    """Scales a single URL's raw features onto the same axis as feature_average_chart_points()."""
    scores = {}
    for column in FEATURE_COLUMNS:
        stats = FEATURE_STATS[column]
        scores[column] = zscore(features[column], stats["mean"], stats["std"])
    return scores
