import io
import time
import threading
import pandas as pd
from typing import Union
from fastapi import FastAPI
from pydantic import BaseModel
from ops import run_steps, OpError

app = FastAPI()

CACHE = {} 
TTL_SECONDS = 1800 #30 mins

class LoadRequest(BaseModel):
    sheetId: str
    csv: str

class ExecuteRequest(BaseModel):
    sheetId: str
    csv: str
    steps: list[dict]
    final_step: Union[str, list[str]]  

def parse_csv(csv_text: str) -> pd.DataFrame:
    return pd.read_csv(io.StringIO(csv_text), skiprows=1)

@app.post("/load")
def load(req: LoadRequest):
    df = parse_csv(req.csv);
    CACHE[req.sheetId] = {"df": df, "last_used": time.time()}
    return {
        "rowCount": len(df),
        "columns": list(df.columns)
    }

@app.post("/execute")
def execute(req: ExecuteRequest):
    entry = CACHE.get(req.sheetId)

    if entry is None:
        df = parse_csv(req.csv)
        CACHE[req.sheetId] = {"df": df, "last_used": time.time()}
    else:
        df = entry["df"]
        entry["last_used"] = time.time()

    valid_columns = set(df.columns)

    try:
        result = run_steps(df, req.steps, req.final_step, valid_columns)
    except OpError as e:
        return {"status": "error", **e.payload}

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

class ColumnsRequest(BaseModel):
    sheetId: str
    csv: str

@app.post("/columns")
def columns(req: ColumnsRequest):
    entry = CACHE.get(req.sheetId)

    if entry is None:
        df = parse_csv(req.csv)
        CACHE[req.sheetId] = {"df": df, "last_used": time.time()}
    else:
        df = entry["df"]
        entry["last_used"] = time.time()

    return {"columns": list(df.columns)}

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