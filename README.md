# JD-AI-ANALYZER

JD-AI-ANALYZER turns a job-description URL or pasted listing into a concise role summary, relevant technologies, relative skill emphasis, and knowledge areas.

## Features

- Accepts a public job-description URL or pasted job-description text.
- Retrieves readable text from public pages when possible; inaccessible pages offer a paste-text fallback.
- Uses Gemini structured JSON output to distinguish tools from concepts.
- Shows tool importance as an AI-estimated, description-specific relative score—not a labor-market statistic.
- Keeps the Gemini API key exclusively on the backend.

## Architecture

```text
Browser (GitHub Pages) → FastAPI on Render → Gemini API
```

The frontend is plain HTML, CSS, and JavaScript. The FastAPI backend retrieves a supported public URL when needed, sends the description to Gemini, and returns structured JSON. There is no database, login system, or persistent user data.

## Project structure

```text
frontend/                 Static GitHub Pages site
  index.html
  css/style.css
  js/config.js            Public Render API URL only
  js/app.js
backend/                  FastAPI application
  main.py
  analyzer.py
  web_content.py
  models.py
  requirements.txt
.env.example              Safe configuration template
render.yaml               Optional Render Blueprint definition
```

## Run locally

Requirements: Python 3.11+ and a Gemini API key from Google AI Studio.

1. Create and activate a virtual environment from the project root:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install the backend packages:

   ```powershell
   pip install -r backend/requirements.txt
   ```

3. Copy `.env.example` to `.env`, then set `GEMINI_API_KEY` to your own key. Keep this file private.

4. Start the backend:

   ```powershell
   cd backend
   uvicorn main:app --reload --port 8001
   ```

5. In a second terminal from the project root, serve the frontend:

   ```powershell
   python -m http.server 8000 --directory frontend
   ```

6. Open `http://localhost:8000`. The included frontend config targets `http://localhost:8001` when its deployed API URL is blank.

## Deploy the backend to Render

1. Push this project to GitHub. Never commit `.env`.
2. Create a **Web Service** on Render using this repository.
3. Set **Language** to Python, **Root Directory** to `backend`, **Build Command** to `pip install -r requirements.txt`, and **Start Command** to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
4. Add these Render environment variables:

   | Key | Value |
   | --- | --- |
   | `GEMINI_API_KEY` | Your real Gemini key |
   | `GEMINI_MODEL` | `gemini-3.6-flash` |
   | `FRONTEND_ORIGINS` | Your GitHub Pages origin, such as `https://YOUR-USERNAME.github.io` |

5. Deploy and visit `https://YOUR-RENDER-URL/health`. It should return `{"status":"ok"}`.

Free Render instances can take a short time to wake up after inactivity.

## Deploy the frontend to GitHub Pages

1. In `frontend/js/config.js`, set `API_BASE_URL` to your Render URL, such as `https://jd-ai-analyzer.onrender.com`. Do not add secrets to this file.
2. Push the change to GitHub.
3. In GitHub: **Settings → Pages → Build and deployment**, select **Deploy from a branch**, choose `main`, then choose the `/(root)` folder. GitHub Pages supports only the repository root or `/docs`; the root page automatically opens the app in `/frontend/`.
4. Copy the resulting Pages origin (for example `https://YOUR-USERNAME.github.io`) into Render's `FRONTEND_ORIGINS` variable and redeploy the backend.

## Security notes

- API keys belong only in local `.env` files and Render environment variables.
- If a key is ever shared publicly, revoke and replace it immediately.
- The backend limits request and fetched-page sizes, refuses local/private URL targets, and returns friendly errors instead of raw stack traces.
