import sys
import threading

import uvicorn

# Run this script from the project root.
sys.path.insert(0, "backend")

mode = sys.argv[1]
port = int(sys.argv[2])

import security_utils
import prediction
import main

if mode == "off":
    # Relax the concurrency and body-size defences for baseline testing.
    prediction.prediction_slots = threading.BoundedSemaphore(100000)
    security_utils.MAX_BODY_BYTES = 100 * 1024 * 1024

elif mode == "strict":
    # Use a small limit only if the normal limit of 8
    # does not produce any HTTP 503 responses.
    prediction.prediction_slots = threading.BoundedSemaphore(2)

elif mode != "on":
    raise ValueError("Mode must be off, on or strict")

uvicorn.run(main.app, host="127.0.0.1", port=port)