import pandas as pd
import numpy as np


class OpError(Exception):
    def __init__(self, code, step_id, detail, **extra):
        self.payload = {"error": code, "step_id": step_id, "detail": detail, **extra}
        super().__init__(detail)


VALID_AGGS = {"sum", "mean", "count", "min", "max", "median", "nunique"}
VALID_CMP_OPS = {
    "gt": lambda s, v: s > v,
    "gte": lambda s, v: s >= v,
    "lt": lambda s, v: s < v,
    "lte": lambda s, v: s <= v,
}


def op_groupby_agg(df, params):
    agg = params["agg"]
    if agg not in VALID_AGGS:
        raise ValueError(f"agg '{agg}' not in {VALID_AGGS}")
    return df.groupby(params["group_by"])[params["metric"]].agg(agg)


def op_aggregate(df, params):
    agg = params["agg"]
    if agg not in VALID_AGGS:
        raise ValueError(f"agg '{agg}' not in {VALID_AGGS}")
    return df[params["column"]].agg(agg)


def op_filter_eq(df, params):
    return df[df[params["column"]] == params["value"]]


def op_filter_isin(df, params):
    return df[df[params["column"]].isin(params["values"])]


def op_filter_cmp(data, params):
    # FIX: previously dataframe-only, which crashed on "which cities didn't
    # reach 2 million in revenue?" — that needs filtering a groupby_agg
    # SERIES by its own values (no "column" involved), a different, equally
    # valid case from filtering original rows by a column's value.
    operator = params["operator"]
    if operator not in VALID_CMP_OPS:
        raise ValueError(f"operator '{operator}' not in {list(VALID_CMP_OPS)}")
    if isinstance(data, pd.Series):
        return data[VALID_CMP_OPS[operator](data, params["value"])]
    return data[VALID_CMP_OPS[operator](data[params["column"]], params["value"])]


def op_sort_values(data, params):
    ascending = params.get("ascending", True)
    if isinstance(data, pd.Series):
        return data.sort_values(ascending=ascending)
    return data.sort_values(params["column"], ascending=ascending)


def op_top_n(data, params):
    ascending = params.get("ascending", False)
    if isinstance(data, pd.Series):
        sorted_data = data.sort_values(ascending=ascending)
    else:
        sorted_data = data.sort_values(params["column"], ascending=ascending)
    return sorted_data.head(params["n"])


def op_idxmax(series, params):
    if len(series) == 0:
        raise ValueError("idxmax on empty series")
    return series.idxmax()


def op_idxmin(series, params):
    if len(series) == 0:
        raise ValueError("idxmin on empty series")
    return series.idxmin()


def op_max_value(series, params):
    if len(series) == 0:
        raise ValueError("max_value on empty series")
    return series.max()


def op_min_value(series, params):
    if len(series) == 0:
        raise ValueError("min_value on empty series")
    return series.min()


def op_value_counts(df, params):
    return df[params["column"]].value_counts()


def op_count_rows(df, params):
    return int(len(df))


def op_get_value(data, params):
    if len(data) == 0:
        raise ValueError("get_value on empty result")
    if isinstance(data, pd.Series):
        return data.iloc[0]
    return data.iloc[0][params["column"]]


OPS = {
    "groupby_agg": op_groupby_agg,
    "aggregate": op_aggregate,
    "filter_eq": op_filter_eq,
    "filter_isin": op_filter_isin,
    "filter_cmp": op_filter_cmp,
    "sort_values": op_sort_values,
    "top_n": op_top_n,
    "idxmax": op_idxmax,
    "idxmin": op_idxmin,
    "max_value": op_max_value,
    "min_value": op_min_value,
    "value_counts": op_value_counts,
    "count_rows": op_count_rows,
    "get_value": op_get_value,
}

DATAFRAME_INPUT_OPS = {
    "groupby_agg", "aggregate", "filter_eq", "filter_isin",
    "value_counts", "count_rows",
}
SERIES_INPUT_OPS = {"idxmax", "idxmin", "max_value", "min_value"}
# these accept either shape
EITHER_INPUT_OPS = {"sort_values", "top_n", "get_value", "filter_cmp"}

COLUMN_PARAM_KEYS = {"column"}
COLUMN_LIST_PARAM_KEYS = {"group_by"}
REF_SUFFIX = "_from"


def resolve_refs(step_id, params, results):
    resolved = {}
    for key, value in params.items():
        if key.endswith(REF_SUFFIX):
            target_field = key[: -len(REF_SUFFIX)]
            if value not in results:
                raise OpError("BAD_INPUT_REF", step_id, f"referenced step '{value}' not found")
            resolved[target_field] = results[value]
        else:
            resolved[key] = value
    return resolved


def validate_columns(step_id, params, valid_columns):
    for key in COLUMN_PARAM_KEYS:
        if key in params and params[key] not in valid_columns:
            raise OpError("UNKNOWN_COLUMN", step_id, f"column '{params[key]}' not in schema",
                          available_columns=sorted(valid_columns))
    for key in COLUMN_LIST_PARAM_KEYS:
        if key in params:
            for col in params[key]:
                if col not in valid_columns:
                    raise OpError("UNKNOWN_COLUMN", step_id, f"column '{col}' not in schema",
                                  available_columns=sorted(valid_columns))
    if "metric" in params and params["metric"] not in valid_columns:
        raise OpError("UNKNOWN_COLUMN", step_id, f"column '{params['metric']}' not in schema",
                      available_columns=sorted(valid_columns))


def _to_native(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    return value


def serialize(obj):
    if isinstance(obj, pd.DataFrame):
        return {"kind": "dataframe", "data": obj.reset_index().to_dict(orient="records")}
    if isinstance(obj, pd.Series):
        return {"kind": "series", "data": [{"key": _to_native(k), "value": _to_native(v)} for k, v in obj.items()]}
    return {"kind": "scalar", "data": _to_native(obj)}


def run_steps(df, steps, final_step, valid_columns):
    if not steps:
        raise OpError("NO_STEPS", None, "steps array is empty")

    results = {"df": df}
    seen = {"df"}

    for step in steps:
        step_id = step.get("id")
        op_name = step.get("op")

        if not step_id or step_id in seen:
            raise OpError("BAD_STEP_ID", step_id, "missing or duplicate step id")
        if op_name not in OPS:
            raise OpError("UNKNOWN_OP", step_id, f"'{op_name}' is not whitelisted")

        input_ref = step.get("input", "df")
        if input_ref not in results:
            raise OpError("BAD_INPUT_REF", step_id, f"input '{input_ref}' has not been produced yet")
        input_data = results[input_ref]

        if op_name in DATAFRAME_INPUT_OPS and not isinstance(input_data, pd.DataFrame):
            raise OpError("TYPE_MISMATCH", step_id, f"'{op_name}' requires a dataframe input")
        if op_name in SERIES_INPUT_OPS and not isinstance(input_data, pd.Series):
            raise OpError("TYPE_MISMATCH", step_id, f"'{op_name}' requires a series input")
        if op_name in EITHER_INPUT_OPS and not isinstance(input_data, (pd.DataFrame, pd.Series)):
            raise OpError("TYPE_MISMATCH", step_id, f"'{op_name}' requires a dataframe or series input")

        params = resolve_refs(step_id, step.get("params", {}), results)
        validate_columns(step_id, params, valid_columns)

        try:
            results[step_id] = OPS[op_name](input_data, params)
        except OpError:
            raise
        except Exception as e:
            raise OpError("EXEC_FAILED", step_id, str(e))

        seen.add(step_id)

    final_ids = final_step if isinstance(final_step, list) else [final_step]
    for fid in final_ids:
        if fid not in results:
            raise OpError("BAD_FINAL_STEP", fid, "final_step id was never produced")

    if isinstance(final_step, list):
        return {
            "empty": False,
            "kind": "multiple",
            "data": {fid: serialize(results[fid]) for fid in final_ids},
        }

    final_result = results[final_step]
    if isinstance(final_result, (pd.DataFrame, pd.Series)) and len(final_result) == 0:
        return {"empty": True, **serialize(final_result)}
    return {"empty": False, **serialize(final_result)}