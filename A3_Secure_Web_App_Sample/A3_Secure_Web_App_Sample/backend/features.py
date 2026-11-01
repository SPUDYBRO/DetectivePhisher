from __future__ import annotations

from collections import Counter
from urllib.parse import urlparse
import ipaddress
import math
import re

import numpy as np

PHISHING_FEATURES = [
    "url_length",
    "hostname_length",
    "path_length",
    "dot_count",
    "hyphen_count",
    "digit_ratio",
    "special_char_count",
    "has_https",
    "has_ip_host",
    "subdomain_count",
    "suspicious_keyword_count",
]

AI_TEXT_FEATURES = [
    "avg_word_length",
    "avg_sentence_length",
    "lexical_diversity",
    "punctuation_ratio",
    "repeated_word_ratio",
    "sentence_length_std",
]

LOG_FEATURES = [
    "failed_logins",
    "error_count",
    "warning_count",
    "unique_ip_count",
    "requests_per_minute",
]

SUSPICIOUS_URL_WORDS = {
    "login", "verify", "account", "secure", "update",
    "bank", "paypal", "signin", "confirm", "password",
    "wallet", "invoice", "payment", "claim"
}


def _is_ip(hostname: str) -> int:
    try:
        ipaddress.ip_address(hostname)
        return 1
    except ValueError:
        return 0


def extract_phishing_features(url: str) -> dict[str, float]:
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    path = parsed.path or ""
    digits = sum(ch.isdigit() for ch in url)
    parts = [p for p in hostname.split(".") if p]

    return {
        "url_length": float(len(url)),
        "hostname_length": float(len(hostname)),
        "path_length": float(len(path)),
        "dot_count": float(url.count(".")),
        "hyphen_count": float(url.count("-")),
        "digit_ratio": digits / max(1, len(url)),
        "special_char_count": float(sum(ch in "@%?=&_~" for ch in url)),
        "has_https": 1.0 if parsed.scheme.lower() == "https" else 0.0,
        "has_ip_host": float(_is_ip(hostname)),
        "subdomain_count": float(max(0, len(parts) - 2)),
        "suspicious_keyword_count": float(sum(w in url.lower() for w in SUSPICIOUS_URL_WORDS)),
    }


def phishing_vector(url: str) -> np.ndarray:
    f = extract_phishing_features(url)
    return np.array([f[name] for name in PHISHING_FEATURES], dtype=float)


def extract_ai_text_features(text: str) -> dict[str, float]:
    words = re.findall(r"\b[\w'-]+\b", text.lower())
    sentences = [s.strip() for s in re.split(r"[.!?]+", text) if s.strip()]

    word_lengths = [len(w) for w in words] or [0]
    sentence_lengths = [len(re.findall(r"\b[\w'-]+\b", s)) for s in sentences] or [0]
    counts = Counter(words)
    repeated = sum(max(0, n - 1) for n in counts.values())

    return {
        "avg_word_length": float(np.mean(word_lengths)),
        "avg_sentence_length": float(np.mean(sentence_lengths)),
        "lexical_diversity": len(set(words)) / max(1, len(words)),
        "punctuation_ratio": sum(ch in ",;:!?-()" for ch in text) / max(1, len(text)),
        "repeated_word_ratio": repeated / max(1, len(words)),
        "sentence_length_std": float(np.std(sentence_lengths)),
    }


def ai_text_vector(text: str) -> np.ndarray:
    f = extract_ai_text_features(text)
    return np.array([f[name] for name in AI_TEXT_FEATURES], dtype=float)


def extract_log_features(text: str) -> dict[str, float]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    lower = [line.lower() for line in lines]

    failed = sum("failed" in line and ("login" in line or "auth" in line) for line in lower)
    errors = sum("error" in line or "critical" in line for line in lower)
    warnings = sum("warn" in line for line in lower)

    ip_pattern = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
    ips = set()
    for line in lines:
        ips.update(ip_pattern.findall(line))

    # In this teaching sample we treat line count as a simple proxy for request rate.
    request_rate = float(len(lines))

    return {
        "failed_logins": float(failed),
        "error_count": float(errors),
        "warning_count": float(warnings),
        "unique_ip_count": float(len(ips)),
        "requests_per_minute": request_rate,
    }


def log_vector(text: str) -> np.ndarray:
    f = extract_log_features(text)
    return np.array([f[name] for name in LOG_FEATURES], dtype=float)
