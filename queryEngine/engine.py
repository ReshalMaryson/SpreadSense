import io
import os
import time
import threading
import pandas as pd
from typing import Union
from fastapi import FastAPI, Header, HTTPException, Depends
from pydantic import BaseModel
from ops import run_steps, OpError

from dotenv import load_dotenv;
load_dotenv()

app = FastAPI()

CACHE = {}  
TTL_SECONDS = 1800  # 30 minutes

INTERNAL_SECRET = os.environ.get("QUERY_ENGINE_SECRET")
if not INTERNAL_SECRET:
    raise RuntimeError(
        "UNAUTHENTICATED: QUERY_ENGINE_SECRET is not set."
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


def parse_csv(csv_text: str) -> pd.DataFrame:
    return pd.read_csv(io.StringIO(csv_text), skiprows=1)


def _get_or_load(sheet_id: str, csv_text: str) -> pd.DataFrame:
    entry = CACHE.get(sheet_id)
    if entry is None:
        df = parse_csv(csv_text)
        CACHE[sheet_id] = {"df": df, "last_used": time.time()}
        return df
    entry["last_used"] = time.time()
    return entry["df"]



#server pinger
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/load", dependencies=[Depends(verify_internal_secret)])
def load(req: LoadRequest):
    try:
        df = _get_or_load(req.sheetId, req.csv)
        return {"status": "ok", "rowCount": len(df), "columns": list(df.columns)}
    except Exception as e:
        print(f"Unexpected /load error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}


@app.post("/columns", dependencies=[Depends(verify_internal_secret)])
def columns(req: ColumnsRequest):
    try:
        df = _get_or_load(req.sheetId, req.csv)
        return {"status": "ok", "columns": list(df.columns)}
    except Exception as e:
        print(f"Unexpected /columns error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}


@app.post("/execute", dependencies=[Depends(verify_internal_secret)])
def execute(req: ExecuteRequest):
    try:
        df = _get_or_load(req.sheetId, req.csv)
    except Exception as e:
        print(f"Unexpected /execute load error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}

    valid_columns = set(df.columns)

    try:
        result = run_steps(df, req.steps, req.final_step, valid_columns)
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