import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from analyzer import AnalysisError, analyze_content
from models import AnalyzeRequest, JobAnalysis
from web_content import UrlFetchError

load_dotenv()


def allowed_origins() -> list[str]:
    configured = os.getenv("FRONTEND_ORIGINS", "")
    production = [origin.strip() for origin in configured.split(",") if origin.strip()]
    local = ["http://localhost:8000", "http://127.0.0.1:8000"]
    return list(dict.fromkeys(local + production))


app = FastAPI(title="JD-AI-ANALYZER API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/analyze", response_model=JobAnalysis)
async def analyze_job_description(payload: AnalyzeRequest) -> JobAnalysis:
    try:
        return await run_in_threadpool(analyze_content, payload.content)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except UrlFetchError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except AnalysisError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
