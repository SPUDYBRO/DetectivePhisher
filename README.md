# DetectivePhisher
A full-stack web application of a malicious URL detecter using AI

## Running the application

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later (includes npm)
- [Python](https://www.python.org/) 3.11 or later

### 1. Install the front end

From the repository root:

```powershell
npm install
```

### 2. Install the back end

It's recommended to use a virtual environment so the pinned package versions don't clash with anything else on your machine:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

### 3. Run everything

From the repository root, with the backend's virtual environment still active (so `uvicorn` is on PATH):

```powershell
npm run full
```

This starts the FastAPI back end on `http://127.0.0.1:8000` and the Vite front end on `http://localhost:5173` together. Open **http://localhost:5173** in your browser.

The first time this runs, if no trained model is found under `backend/Models/`, the server trains one automatically from `backend/data/` before it becomes ready — the front end shows a loading state in the meantime, so the page is never blank while this happens.

To run the two halves separately instead (e.g. in two terminals), use `npm run back` and `npm run front`.

### Checking the production build

```powershell
npm run build
npm run preview
```

`npm run preview` serves the built front end on `http://localhost:4173`, which the back end's CORS settings also allow.
