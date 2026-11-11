import requests

api_url = "http://127.0.0.1:8002/api/predict"

print("Testing a normal request")

try:
    response = requests.post(
        api_url,
        json={"url": "https://example.com"},
        timeout=30,
    )
    print("Status:", response.status_code)
    print("Response:", response.text[:200])

except requests.RequestException as error:
    print("Request failed:", error)

print("Testing an oversized JSON request")

try:
    response = requests.post(
        api_url,
        json={
            "url": "https://example.com",
            "extra": "x" * 20000,
        },
        timeout=30,
    )
    print("Status:", response.status_code)
    print("Response:", response.text[:200])

except requests.RequestException as error:
    print("Request failed:", error)

print("Testing a 5 MB request body")

try:
    response = requests.post(
        api_url,
        data=b"x" * (5 * 1024 * 1024),
        headers={"Content-Type": "application/json"},
        timeout=30,
    )
    print("Status:", response.status_code)
    print("Response:", response.text[:200])

except requests.RequestException as error:
    print("Request failed:", error)