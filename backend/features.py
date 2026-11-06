import re
import numpy as np
import pandas
from urllib.parse import urlparse



IP_PATTERN = re.compile(
    r"^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}"
    r"(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$"
)
SPECIAL_CHARS_PATTERN = re.compile(r"[@%=&?]")

# The columns that get added to the csv. Keep these in the same order as the values in get_url_features
FEATURE_COLUMNS = [ # All commented out sections are removed because of EDA
    # "url_length",
    "num_dots",
    "num_hyphens",
    "host_hyphens",
    # "num_digits",
    # "num_special_chars",
    "has_https",
    "has_ip",
    # "num_subdomains",
    "domain_length",
    "has_at_symbol",
    # "path_length",
    # "url_entropy"
]



def get_url_features(url: str) -> dict | None:
    """Works out the features of a single url (length, dots, hyphens, digits and so on)
 
    Args:
        url (str): The url to work out the features of
 
    Returns:
        dict | None: The features of the url, or None if the url is empty or malformed
    """
    # Empty cells are read in as NaN (not a string), so those count as empty too
    if pandas.isna(url) or url == "":
        return None
 
    # urlparse needs the http:// at the start to find the hostname, so add it if the url doesn't have it
    if url.startswith(("http://", "https://")):
        full_url = url
    else:
        full_url = f"http://{url}"
 
    try:
        parsed_url = urlparse(full_url)
        host = parsed_url.hostname or ""   # hostname already leaves the port out, so there is nothing to split off
        path = parsed_url.path or ""
    except ValueError:
        # Things like invalid IPv6 brackets make urlparse fail, so the url counts as malformed
        return None
 
 
    # ===== Features that just count things in the whole url =====
 
    # url_length = len(url) Removed because of EDA
    # # FEATURE DONE: url_length
 
    num_dots = url.count(".")
    # FEATURE DONE: num_dots
 
    num_hyphens = url.count("-")
    # FEATURE DONE: num_hyphens
 
    # num_digits = 0 Removed because of EDA
    # for character in url:
    #     if character.isdigit():
    #         num_digits += 1
    # # FEATURE DONE: num_digits
 
    # num_special_chars = len(SPECIAL_CHARS_PATTERN.findall(url)) Removed because of EDA
    # # FEATURE DONE: num_special_chars
 
    has_https = 0
    if url.lower().startswith("https://"):
        has_https = 1
    elif not url.lower().startswith("http://"):
        has_https = float("nan")   # doesn't have either, so we don't know
    # FEATURE DONE: has_https
 
    has_at_symbol = "@" in url
    # FEATURE DONE: has_at_symbol
 
 
    # ===== Features that come from the host (the domain part) =====
 
    # hyphens in the host only, the whole-url num_hyphens above is mostly hyphens from article titles in the path
    host_hyphens = host.count("-")
    # FEATURE DONE: host_hyphens
 
    domain_length = len(host)
    # FEATURE DONE: domain_length
 
    has_ip = False
    if IP_PATTERN.match(host):
        has_ip = True
    # FEATURE DONE: has_ip
 
    # An IP address has no subdomains, and www is not counted as one either
    # if has_ip: Removed because of EDA
    #     num_subdomains = 0
    # else:
    #     host_without_www = host.removeprefix("www.")
    #     num_subdomains = max(host_without_www.count(".") - 1, 0)
    # # FEATURE DONE: num_subdomains
 
 
    # ===== Features that come from the path =====
 
    # path_length = len(path) Removed because of EDA
    # # FEATURE DONE: path_length
 
 
    # # ===== URL entropy ===== Removed because of EDA
    # # Lowercase first so HTTPS:// and WWW. are caught too, and capital letters don't add extra "different" characters
    # clean_url = url.lower()
    # # remove http / https / www / to get rid of noise
    # if clean_url.startswith("https://"):
    #     clean_url = clean_url.removeprefix("https://")
    # elif clean_url.startswith("http://"):
    #     clean_url = clean_url.removeprefix("http://")
 
    # if clean_url.startswith("www."):
    #     clean_url = clean_url.removeprefix("www.")
 
    # total = len(clean_url)
 
    # # count how many times each character appears in the URL
    # chars = pandas.Series(list(clean_url))
    # counts = chars.value_counts()
 
    # # the formula is: H = -sum(p * log2(p)) for each character
    # url_entropy = 0
    # for char, count in counts.items():
    #     p = count / total
    #     url_entropy = url_entropy - p * math.log2(p)
    # # FEATURE DONE: url_entropy
 
 
    # Every feature is finished by this point, this just puts them together in the same order as FEATURE_COLUMNS
    features = {
        # "url_length": url_length, Removed because of EDA
        "num_dots": num_dots,
        "num_hyphens": num_hyphens,
        "host_hyphens": host_hyphens,   # new, add "host_hyphens" to FEATURE_COLUMNS (features.py and app.py) to use it
        # "num_digits": num_digits, Removed because of EDA
        # "num_special_chars": num_special_chars, Removed because of EDA
        "has_https": has_https,
        "has_ip": has_ip,
        # "num_subdomains": num_subdomains, Removed because of EDA
        "domain_length": domain_length,
        "has_at_symbol": has_at_symbol,
        # "path_length": path_length, Removed because of EDA
        # "url_entropy": url_entropy Removed because of EDA
    }
 
    return features