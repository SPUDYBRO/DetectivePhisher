import threading
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from starlette.datastructures import MutableHeaders
from urllib.parse import urlparse, unquote
from pathlib import Path
import unicodedata

import joblib
import pandas as panda

from train import MODEL_PATH
from features import extract_features, features_dict_to_ordered_list

MAX_BODY_BYTES = 16*1024
MAX_CONCURRENT_PREDICTIONS = 8

prediction_slots = threading.BoundedSemaphore(MAX_CONCURRENT_PREDICTIONS)


class BodySizeLimitMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        

        content_length = None
        for name, value in scope["headers"]:
            if name == b"content-length":
                content_length = int(value)


        if content_length and content_length > MAX_BODY_BYTES:
            response = JSONResponse(status_code=413, content={"detail": "This packet is too large"})
            await response(scope, receive, send)
            return
            
        bytes_seen = 0
        
        async def counting_received_bytes():
            nonlocal bytes_seen
            message = await receive()
            if message["type"] == "http.request":
                bytes_seen += len(message.get("body", b""))
                if bytes_seen > MAX_BODY_BYTES:
                    raise HTTPException(413, "This packet is too large")
                
            return message
        
        await self.app(scope, counting_received_bytes, send)
        
        
        



class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
            await send(message)

        await self.app(scope, receive, send_with_headers)


# ############################################# #
# Detection Evasion Defence (URL normalization) #
# ############################################# #

# Deliberately small, curated subset of Unicode's "confusables" list: characters
# attackers commonly swap in to fool structural checks (dots, hyphens, @) while
# still looking right to a person. NFKC (used below) catches fullwidth forms on
# its own, but doesn't touch cross-script look-alikes like Cyrillic/Greek letters
# or the CJK "ideographic full stop", so those are mapped here by hand.
CONFUSABLES = {
    # Cyrillic lookalikes for Latin letters
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O",
    "Р": "P", "С": "C", "Т": "T", "Х": "X",
    # Greek lookalikes for Latin letters
    "ο": "o", "ρ": "p", "υ": "y", "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z",
    "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P",
    "Τ": "T", "Χ": "X",
    # Punctuation lookalikes used to hide a dot/hyphen/at-symbol from the model
    "。": ".", "．": ".",
    "‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-", "－": "-",
    "＠": "@",
}


def _fold_confusables(text: str) -> str:
    """Normalises compatibility variants (e.g. fullwidth forms) via NFKC, then
    maps the characters in CONFUSABLES to the ASCII character they imitate.
    """
    text = unicodedata.normalize("NFKC", text)
    return "".join(CONFUSABLES.get(character, character) for character in text)


def normalize_url(url: str) -> str:
    """Rewrites a URL into a canonical form so look-alike tricks (percent-encoding,
    Unicode homoglyphs, punycode/IDN domains, case/dot differences) can't change
    the features extracted from it compared to the "real" URL they're designed to
    visually imitate.

    Must only be called on a URL that has already passed the basic checks in
    `validate_url` (emptiness, spaces/control characters, scheme).

    Args:
        url (str): A validated URL

    Returns:
        str: The same URL, rewritten into a canonical form
    """
    # Percent-decoding can reveal spaces/control characters that validate_url
    # already rejected in their encoded form, so re-check for them here.
    decoded = unquote(url)
    for character in decoded:
        if character == " " or unicodedata.category(character).startswith("C"):
            raise HTTPException(422, "The URL contains spaces, or hidden/unusual characters, once decoded")

    # Folds look-alike characters everywhere (not just the host), since features
    # like num_dots/num_hyphens/has_at_symbol are counted across the whole URL.
    folded = _fold_confusables(decoded)

    parsed = urlparse(folded)
    hostname = parsed.hostname or ""

    # Punycode/IDN labels (xn--...) are decoded back to Unicode, then re-folded,
    # so a domain submitted as punycode normalizes the same way as one submitted
    # with the raw Unicode characters directly (a homoglyph can be hidden inside
    # either form).
    labels = []
    for label in hostname.split("."):
        if label.lower().startswith("xn--"):
            try:
                label = _fold_confusables(label.encode("ascii").decode("idna"))
            except (UnicodeError, UnicodeDecodeError):
                pass
        labels.append(label)
    hostname = ".".join(labels)

    # Hostnames are case-insensitive, and a trailing or duplicated dot doesn't
    # change which domain is being referred to.
    hostname = hostname.lower().rstrip(".")
    while ".." in hostname:
        hostname = hostname.replace("..", ".")

    # Rebuild netloc from the normalized hostname, keeping any userinfo/port
    # that were present (has_at_symbol relies on "user@host" tricks still showing
    # up in the rebuilt URL).
    netloc = hostname
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"
    if parsed.username:
        userinfo = parsed.username
        if parsed.password:
            userinfo = f"{userinfo}:{parsed.password}"
        netloc = f"{userinfo}@{netloc}"

    return parsed._replace(netloc=netloc).geturl()


# ############################################# #
# Detection Evasion Measurement                  #
# ############################################# #
#
# Measures how often the tricks above (homoglyphs, percent-encoding,
# punycode/IDN domains, case/dot differences) change the model's verdict for a
# URL compared to the real destination it's imitating, before and after
# normalize_url is applied by validate_url.
#
# Run directly from the backend folder: python security_utils.py

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "data" / "corrected_phishing_dataset.csv"

# A single vowel swapped for its Cyrillic look-alike, used to force a real
# "xn--" punycode encoding out of idna.encode (ascii-only hosts never produce one).
CYRILLIC_LOOKALIKES = {"a": "а", "o": "о", "e": "е"}

HOMOGLYPH_DASH = "\u2010"   # HYPHEN
HOMOGLYPH_DOT = "\u3002"    # IDEOGRAPHIC FULL STOP


def _rebuild_with_host(parsed, new_host):
    """Swaps in a new hostname while keeping any userinfo/port from the original URL."""
    netloc = new_host
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"
    if parsed.username:
        userinfo = parsed.username
        if parsed.password:
            userinfo = f"{userinfo}:{parsed.password}"
        netloc = f"{userinfo}@{netloc}"
    return parsed._replace(netloc=netloc).geturl()


def homoglyph_variant(url):
    """Look-alike Unicode punctuation standing in for '-' and '.' in the host."""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    new_host = host.replace("-", HOMOGLYPH_DASH).replace(".", HOMOGLYPH_DOT)
    return _rebuild_with_host(parsed, new_host)


def percent_encoding_variant(url):
    """'-' in the host hidden behind its percent-encoded form. (Dots are left alone:
    percent-encoding the host's dots already gets rejected outright by validate_url's
    pre-existing top-level-domain check, since there's no literal "." left for it to
    find a suffix with - that's a side effect of an unrelated check, not a defence
    against this technique, so dot percent-encoding isn't a useful thing to measure.)"""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    new_host = host.replace("-", "%2D")
    return _rebuild_with_host(parsed, new_host)


def punycode_idn_variant(url):
    """One letter swapped for a Cyrillic look-alike, then the host is idna-encoded
    to punycode, mimicking an attacker registering a homoglyph domain and relying
    on the raw 'xn--' form reaching the model unresolved."""
    parsed = urlparse(url)
    host = parsed.hostname or ""

    cyrillic_host = host
    for latin, cyrillic in CYRILLIC_LOOKALIKES.items():
        if latin in cyrillic_host:
            cyrillic_host = cyrillic_host.replace(latin, cyrillic, 1)
            break
    else:
        return None  # host has none of our look-alike vowels, skip it

    try:
        encoded_labels = [label.encode("idna").decode("ascii") for label in cyrillic_host.split(".")]
    except UnicodeError:
        return None

    return _rebuild_with_host(parsed, ".".join(encoded_labels))


def case_and_dots_variant(url):
    """SHOUTING-case host plus a harmless trailing dot (both refer to the same domain)."""
    parsed = urlparse(url)
    host = parsed.hostname or ""
    new_host = host.upper() + "."
    return _rebuild_with_host(parsed, new_host)


TECHNIQUES = {
    "homoglyphs": homoglyph_variant,
    "percent_encoding": percent_encoding_variant,
    "punycode_idn": punycode_idn_variant,
    "case_and_dots": case_and_dots_variant,
}


def load_model():
    bundle = joblib.load(MODEL_PATH)
    return bundle["model"]


def verdict(model, url, normalize):
    """Returns the model's verdict, or None if validate_url rejects the URL outright
    (e.g. no recognisable top-level domain once normalization is skipped, since a
    percent-encoded host dot isn't a real "." for the TLD check to find)."""
    # Imported here, not at module level, since validation.py imports normalize_url
    # from this module - importing validate_url back at the top would be circular.
    from validation import validate_url

    try:
        validated = validate_url(url, normalize=normalize)
    except HTTPException:
        return None
    features = extract_features(validated)
    ordered = features_dict_to_ordered_list(features)
    probability = model.predict_proba([ordered])[0][1]
    return "phishing" if probability >= 0.5 else "legitimate"


def load_seed_urls(model, limit=200):
    """Picks real phishing URLs from the dataset that the (fixed) model already
    recognises as phishing, and that have both a '-' and a '.' in the host so
    every technique above has something to work with."""
    frame = panda.read_csv(DATASET_PATH)
    phishing_rows = frame.loc[frame["type"] == "phishing", "url"].tolist()

    seeds = []
    for raw in phishing_rows:
        url = raw if "://" in raw else f"http://{raw}"

        parsed = urlparse(url)
        host = parsed.hostname or ""
        if "-" not in host or "." not in host:
            continue

        if verdict(model, url, normalize=True) != "phishing":
            continue

        seeds.append(url)
        if len(seeds) >= limit:
            break

    return seeds


def measure_evasion():
    model = load_model()
    seeds = load_seed_urls(model)
    print(f"Using {len(seeds)} real phishing URLs from the dataset as seeds\n")

    for name, make_variant in TECHNIQUES.items():
        attempted = 0
        flips_before = 0
        flips_after = 0
        rejected_before = 0
        rejected_after = 0

        for seed in seeds:
            variant = make_variant(seed)
            if variant is None:
                continue

            attempted += 1
            seed_verdict = verdict(model, seed, normalize=True)

            before = verdict(model, variant, normalize=False)
            if before is None:
                rejected_before += 1
            elif before != seed_verdict:
                flips_before += 1

            after = verdict(model, variant, normalize=True)
            if after is None:
                rejected_after += 1
            elif after != seed_verdict:
                flips_after += 1

        if attempted == 0:
            print(f"{name}: no seeds were usable for this technique\n")
            continue

        print(f"{name}:")
        print(f"  seeds attempted     : {attempted}")
        print(f"  evasion rate before : {flips_before / attempted:.1%} ({rejected_before} rejected outright by validation)")
        print(f"  evasion rate after  : {flips_after / attempted:.1%} ({rejected_after} rejected outright by validation)")
        print()


if __name__ == "__main__":
    measure_evasion()