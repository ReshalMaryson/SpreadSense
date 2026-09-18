import os
import time
import threading
from fastapi.middleware.cors import CORSMiddleware
from typing import Union
from fastapi import FastAPI, Header, HTTPException, Depends, Request
from pydantic import BaseModel
from ops import run_steps, OpError, parse_multi_sheet_csv 

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from dotenv import load_dotenv;
load_dotenv()



app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://spread-sense.vercel.app"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
#rate limiters
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CACHE = {}
TTL_SECONDS = 1800  # 30 minutes 

INTERNAL_SECRET = os.environ.get("QUERY_ENGINE_SECRET")
if not INTERNAL_SECRET:
    raise RuntimeError(
        "QUERY_ENGINE_SECRET env var is not set. This must be set to a random "
        "secret string, matching exactly what Express sends — the service "
        "will not start without it, to avoid ever running unauthenticated."
    )


def verify_internal_secret(x_internal_secret: str = Header(None)):
    if x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


class LoadRequest(BaseModel):
    sheetId: str
    csv: str

class ExecuteRequest(BaseModel):
    sheetId: str
    csv: str
    steps: list[dict]
    final_step: Union[str, list[str]]
    

class ColumnsRequest(BaseModel):
    sheetId: str
    csv: str

def parse_csv(csv_text: str) -> dict:
    return parse_multi_sheet_csv(csv_text)

def _get_or_load(sheet_id: str, csv_text: str) -> dict:
    entry = CACHE.get(sheet_id)
    if entry is None:
        sheets = parse_csv(csv_text)
        CACHE[sheet_id] = {"sheets": sheets, "last_used": time.time()}
        return sheets
    entry["last_used"] = time.time()
    return entry["sheets"]


@app.get("/health")
@limiter.limit("10/minute")
def health(request: Request):
    print(f"Health check from IP: {request.client.host}")
    return {"status": "ok"}


@app.post("/load", dependencies=[Depends(verify_internal_secret)])
@limiter.limit("20/minute")
def load(request: Request, req: LoadRequest):
    try:
        sheets = _get_or_load(req.sheetId, req.csv)
        return {
            "status": "ok",
            "sheets": {
                name: {"rowCount": len(df), "columns": list(df.columns)}
                for name, df in sheets.items()
            },
        }
    except Exception as e:
        print(f"Unexpected /load error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}


@app.post("/columns", dependencies=[Depends(verify_internal_secret)])
@limiter.limit("20/minute")
def columns(request: Request, req: ColumnsRequest):
    try:
        sheets = _get_or_load(req.sheetId, req.csv)
        return {
            "status": "ok",
            "sheets": {name: list(df.columns) for name, df in sheets.items()},
        }
    except Exception as e:
        print(f"Unexpected /columns error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}


@app.post("/execute", dependencies=[Depends(verify_internal_secret)])
@limiter.limit("20/minute")
def execute(request: Request, req: ExecuteRequest):
    try:
        sheets = _get_or_load(req.sheetId, req.csv)
    except Exception as e:
        print(f"Unexpected /execute load error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}
    try:
        result = run_steps(sheets, req.steps, req.final_step)
    except OpError as e:
        return {"status": "error", **e.payload}
    except Exception as e:
        print(f"Unexpected /execute error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}

    return {"status": "ok", **result}

def evict_expired():
    while True:
        time.sleep(10)
        now = time.time()
        expired_ids = [
            sheet_id for sheet_id, entry in CACHE.items()
            if now - entry["last_used"] > TTL_SECONDS
        ]
        for sheet_id in expired_ids:
            del CACHE[sheet_id]
            print(f"Evicted from cache: {sheet_id}")

threading.Thread(target=evict_expired, daemon=True).start()