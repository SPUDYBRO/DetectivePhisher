import time
import requests
import threading

api_url = "http://127.0.0.1:8001/api/predict"

def send_request(number):
    try:
        response = requests.post(
            api_url,
            json={"url": "https://example.com"},
            timeout=30,
        )

        print(
            "Request", number,
            "Status:", response.status_code,
            "Retry-After:", response.headers.get("Retry-After"),
        )

    except requests.RequestException as error:
        print("Request", number, "failed:", error)

threads = []
start_time = time.perf_counter()

for number in range(1, 31):
    thread = threading.Thread(
        target=send_request,
        args=(number,),
    )
    threads.append(thread)

for thread in threads:
    thread.start()

for thread in threads:
    thread.join()

elapsed_time = time.perf_counter() - start_time
print("Total time:", round(elapsed_time, 3), "seconds")