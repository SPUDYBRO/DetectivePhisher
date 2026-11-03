from __future__ import annotations

from collections import defaultdict, deque
from pathlib import Path
import hashlib
import re
import time
import unicodedata


class SlidingWindowRateLimiter:
    """Small in-memory limiter for classroom use only."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.time()
        history = self._history[key]

        while history and history[0] <= now - self.window_seconds:
            history.popleft()

        if len(history) >= self.max_requests:
            return False

        history.append(now)
        return True

    def reset(self, key: str | None = None) -> None:
        if key is None:
            self._history.clear()
        else:
            self._history.pop(key, None)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            digest.update(chunk)
    return digest.hexdigest()


HOMOGLYPH_MAP = str.maketrans({
    "а": "a", "е": "e", "о": "o", "р": "p",
    "с": "c", "х": "x", "і": "i",
})
ZERO_WIDTH = re.compile(r"[\u200b\u200c\u200d\ufeff]")


def normalise_security_text(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = ZERO_WIDTH.sub("", text)
    text = text.translate(HOMOGLYPH_MAP)
    text = " ".join(text.split())
    return text
