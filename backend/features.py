from urllib.parse import urlparse
import ipaddress

# The columns that the model gets trained on and used to predict with. Keep these in the same order as the values in extract_features
FEATURE_COLUMNS = [
    "num_dots",
    "num_hyphens",
    "host_hyphens",
    "has_https",
    "has_ip",
    "domain_length",
    "has_at_symbol",
]


def extract_features(url: str) -> dict[str, float]:
    """Works out the features of a single url
    features include ["num_dots", "num_hyphens", "host_hyphens", "has_https", "has_ip", "domain_length", "has_at_symbol"]
    
    Note: To use this function, you must have already validated the URL is not malformed via the `validate_url` function
 
    Args:
        url (str): The url to work out the features of
 
    Returns:
        dict: The features of the url
    """
    
 
    parsed_url = urlparse(url)
    
    if parsed_url.hostname is None:
        raise ValueError("extract_features needs a validated URL with a hostname") # This can only happen if we dont validate first
 
    # ===== Features that just count things in the whole url =====
 
    num_dots = url.count(".")
 
    num_hyphens = url.count("-")
 
 
    has_https = 0
    if url.lower().startswith("https://"):
        has_https = 1
 
 
    has_at_symbol = 0
    if "@" in url:
        has_at_symbol = 1
 
 
    # ===== Features that come from the host (the domain part) =====
 
    # hyphens in the host only, the whole-url num_hyphens above is mostly hyphens from article titles in the path
    host_hyphens = parsed_url.hostname.count("-")
 
    domain_length = len(parsed_url.hostname)
 
    has_ip = False
    try: # check if the url is an IP.
        ipaddress.IPv4Address(parsed_url.hostname)
        has_ip = True
    except ValueError:
        pass

    return {
        "num_dots": float(num_dots),
        "num_hyphens": float(num_hyphens),
        "host_hyphens": float(host_hyphens),
        "has_https": float(has_https),
        "has_ip": float(has_ip),
        "domain_length": float(domain_length),
        "has_at_symbol": float(has_at_symbol),
    }
    

def features_dict_to_ordered_list(features: dict[str, float]) -> list[float]:
    """Puts the feature values into the same order the model was trained on (FEATURE_COLUMNS)
    Returned data is ready to be predicted

    Args:
        features (dict[str, float]): The dict of features extracted from a URL by extract_features function

    Returns:
        list[float]: The ordered list of features, ready for model prediction
    """
    ordered_values = []
    for column in FEATURE_COLUMNS:
        ordered_values.append(features[column])
        
    return ordered_values