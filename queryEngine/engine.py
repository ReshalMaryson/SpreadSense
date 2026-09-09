import io
import time
import threading
import pandas as pd
from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
from ops import run_steps, OpError

app = FastAPI()

CACHE = {}  # sheetId -> {"df": dataframe, "last_used": timestamp}
TTL_SECONDS = 1800  # 30 minutes

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
    """Shared cache-check-or-parse logic used by /load, /columns, and /execute."""
    entry = CACHE.get(sheet_id)
    if entry is None:
        df = parse_csv(csv_text)
        CACHE[sheet_id] = {"df": df, "last_used": time.time()}
        return df
    entry["last_used"] = time.time()
    return entry["df"]


@app.post("/load")
def load(req: LoadRequest):
    try:
        df = _get_or_load(req.sheetId, req.csv)
        return {
            "status": "ok",
            "rowCount": len(df),
            "columns": list(df.columns),
        }
    except Exception as e:
        # Catch-all: same principle as /execute below — an unexpected error
        # (a malformed CSV, an unusual dtype, anything not explicitly
        # anticipated) must still return clean JSON, never a raw crash that
        # a calling client can't parse.
        print(f"Unexpected /load error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}


@app.post("/columns")
def columns(req: ColumnsRequest):
    try:
        df = _get_or_load(req.sheetId, req.csv)
        return {"status": "ok", "columns": list(df.columns)}
    except Exception as e:
        print(f"Unexpected /columns error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}


@app.post("/execute")
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
        # Expected, well-understood failures (unknown column, bad chain, etc.)
        return {"status": "error", **e.payload}
    except Exception as e:
        # Catch-all: this is exactly the class of bug that caused the real
        # "Timestamp not JSON serializable" crash — an error we hadn't
        # explicitly coded for should still come back as JSON, not plain
        # text, so the calling client never has to guess what happened.
        print(f"Unexpected /execute error: {e}")
        return {"status": "error", "error": "INTERNAL_ERROR", "detail": str(e)}

    return {"status": "ok", **result}


@app.get("/check-cache/{sheet_id}")
def check_cache(sheet_id: str):
    if sheet_id not in CACHE:
        return {"cached": False}
    return {"cached": True, "rowCount": len(CACHE[sheet_id]["df"])}


@app.get("/debug/columns/{sheet_id}")
def debug_columns(sheet_id: str):
    entry = CACHE.get(sheet_id)
    if entry is None:
        return {"error": "not cached"}
    return {"columns": [repr(c) for c in entry["df"].columns]}


@app.get("/debug/cache")
def debug_cache():
    now = time.time()
    return {
        sheet_id: {
            "rowCount": len(entry["df"]),
            "secondsSinceLastUse": round(now - entry["last_used"], 1),
        }
        for sheet_id, entry in CACHE.items()
    }


def evict_expired():
    while True:
        time.sleep(10)  # check every 10 seconds
        now = time.time()
        expired_ids = [
            sheet_id for sheet_id, entry in CACHE.items()
            if now - entry["last_used"] > TTL_SECONDS
        ]
        for sheet_id in expired_ids:
            del CACHE[sheet_id]
            print(f"Evicted from cache: {sheet_id}")

threading.Thread(target=evict_expired, daemon=True).start()