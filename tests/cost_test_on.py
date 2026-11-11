import time
import requests

url = "https://example.com"
long_url = "http://" + "a-" * 1000 + ".com/"

api_url = "http://127.0.0.1:8002/api/predict"

for test_name, test_url in [
    ("Normal URL", url),
    ("Long URL", long_url),
]:
    print(test_name)

    total_time = 0
    slowest_time = 0
    successful_tests = 0

    for i in range(5):
        start_time = time.perf_counter()

        try:
            response = requests.post(
                api_url,
                json={"url": test_url},
                timeout=30,
            )

            elapsed_time = time.perf_counter() - start_time
            total_time = total_time + elapsed_time
            successful_tests = successful_tests + 1

            if elapsed_time > slowest_time:
                slowest_time = elapsed_time

            print("Status:", response.status_code)
            print("Time:", round(elapsed_time, 3), "seconds")

        except requests.RequestException as error:
            print("Request failed:", error)

    if successful_tests > 0:
        average_time = total_time / successful_tests
        print("Average:", round(average_time, 3), "seconds")
        print("Slowest:", round(slowest_time, 3), "seconds")

    print("--------------------")