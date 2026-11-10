from fastapi import HTTPException

from urllib.parse import urlparse
import unicodedata
import tldextract
import ipaddress


# extractor = tldextract.TLDExtract(suffix_list_urls=()) #tldextract will attempt to download the latest updated tlds from the internet. This will stop it from happening and only use the one that is supplied with the package
tldextract.extract("example.com") # this does the opposite of the code above. It will download it as soon as the server starts so the first request isn't more delayed but instead server launch.

def validate_url(url: str) -> str:
    stripped_url = url.strip()
    
    if not stripped_url: # Check if it was just whitespace
        raise HTTPException(422, "The URL is empty")
    
    
    for character in stripped_url:
        if character == " ":
            raise HTTPException(422, "The URL contains spaces")
        elif unicodedata.category(character).startswith("C"):
            raise HTTPException(422, "The URL contains hidden or unusual characters")
        
        
    #check if the URL starts with a protocol. Will go through all the characters from left to right looking for the specific patter of "://". If it runs into a [".", "?", "#", "/"] before that, then there is no protocol
    def has_scheme() -> bool:
        characters_so_far = ""
        for character in stripped_url:
            characters_so_far += character
            
            if characters_so_far.endswith("://"):
                return True

            if character in (".", "?", "#"):
                return False
            
            if character == "/" and not characters_so_far.endswith(":/"):
                return False
        return False
            
    
    if not has_scheme():
        stripped_url = "http://" + stripped_url
        
    try:
        parsed_url = urlparse(stripped_url)
    except ValueError:
        raise HTTPException(422, detail="The URL isn't a valid URL")
    
    if not parsed_url.scheme in ["http", "https"]:
        raise HTTPException(422, "The URL is using an unsupported protocol. Only use http:// and https://")
    
    if not parsed_url.hostname:
        raise HTTPException(422, detail="The URL doesn't have a hostname")
    
    try: # check if the url is an IP. if it is the case then it will need to skip the top level domain check because ips dont have one
        ipaddress.ip_address(parsed_url.hostname)
    except ValueError:
        if not bool(tldextract.extract(parsed_url.hostname).suffix):
            raise HTTPException(422, "The URL doesn't have a top level domain (e.g .com)")
    
    
    
    return stripped_url
    