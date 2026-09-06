const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const VALID_OPS = [
  "groupby_agg",
  "filter_eq",
  "filter_isin",
  "filter_cmp",
  "sort_values",
  "top_n",
  "idxmax",
  "idxmin",
  "max_value",
  "min_value",
  "value_counts",
  "count_rows",
  "get_value",
];
const VALID_AGGS = ["sum", "mean", "count", "min", "max", "median", "nunique"];

const SYSTEM_INSTRUCTION = `
You turn a user's question about their spreadsheet into a chain of whitelisted
pandas-style operations. You never write code — only the JSON step shape below.

Return ONLY a JSON object:
{
  "steps": [
    { "id": "s1", "op": "<op name>", "input": "df", "params": { ... } }
  ],
  "final_step": "<id of the step whose result answers the question>"
}

Whitelisted ops and their params:
- groupby_agg: { "group_by": ["<column>"], "metric": "<column>", "agg": "sum|mean|count|min|max|median|nunique" } -> series
- filter_eq: { "column": "<column>", "value": <literal> } or { "column": "<column>", "value_from": "<step id>" } -> dataframe
- filter_isin: { "column": "<column>", "values": [<literal>, ...] } -> dataframe
- filter_cmp: { "column": "<column>", "operator": "gt|gte|lt|lte", "value": <number> } -> dataframe
- sort_values: { "column": "<column>", "ascending": true|false } -> dataframe
- top_n: { "column": "<column>", "n": <int>, "ascending": true|false } -> dataframe
- idxmax / idxmin: {} (input must be a series) -> scalar (the entity's name/label)
- max_value / min_value: {} (input must be a series) -> scalar (the actual max/min VALUE in that same series)
- value_counts: { "column": "<column>" } -> series
- count_rows: {} -> scalar
- get_value: { "column": "<column>" } (input must be a single-row dataframe already filtered down to it), or omit "column" when input is a single-value series -> scalar

CRITICAL — filter_eq / filter_isin / filter_cmp only ever take "df" (the original data) or
another FILTERED DATAFRAME step as input. They NEVER take a groupby_agg or value_counts output as
input — those are series, not dataframes, and filtering them is invalid. If you need to narrow
down the original rows, always filter "df" (optionally using a value_from a prior idxmax/idxmin
step), never filter an aggregated series.

CRITICAL — getting the number paired with an idxmax/idxmin result:
- If the number you want is the SAME metric you ranked by (e.g. you grouped by product and
  summed quantity, and you want that top product's quantity) — use max_value/min_value on the
  SAME series idxmax/idxmin ran on. This is always correct and needs no extra filtering, because
  max()/idxmax() (and min()/idxmin()) always refer to the exact same entry by definition.
- If the number you want is a DIFFERENT column than what you ranked by (e.g. you ranked reps by
  revenue but now want their order count) — filter "df" down to that identified entity
  (filter_eq with value_from the idxmax/idxmin step), then groupby_agg/get_value on that filtered
  dataframe for the different metric.
- NEVER call get_value directly on a full, unfiltered series to "get the value at the ranked key"
  — it silently returns whatever is at position 0, which is NOT guaranteed to be the key
  idxmax/idxmin found. This has caused wrong answers before. Use max_value/min_value instead.

Rules:
- "input" is either "df" (the original data) or the "id" of a previous step. Steps run in order.
- Use "<field>_from": "<step id>" instead of a literal to reference a prior step's scalar result
  (e.g. "value_from": "s2" to filter by a product name found in step s2).
- Only use column names from the provided list, copied exactly, including case.
- Only use the ops and agg/operator values listed above. Never invent new ones.
- IDENTITY STEPS ARE NEVER DROPPED. Any idxmax/idxmin step whose result names an entity the
  question asks to identify must ALWAYS have its step id included in "final_step" — even after
  you add more steps to fetch that entity's associated number. Getting the number but losing the
  name is a wrong answer.
- Whenever a question asks for more than one fact — multiple named entities, and/or numbers that
  go with them — set "final_step" to a LIST containing every step id that carries a piece of the
  final answer. Never let one fact crowd out another.
- Keep the chain as short as possible while still answering the question fully, but never shorten
  it by dropping an identity or a number the question actually asked for.
- Return nothing except the JSON object. No prose, no markdown, no code fences.

Example — "which product category has the highest average unit price?" (same-metric case —
use max_value, and note "df" stays the filter target, never a groupby_agg output):
{
  "steps": [
    { "id": "s1", "op": "groupby_agg", "input": "df", "params": { "group_by": ["Category"], "metric": "Unit_Price", "agg": "mean" } },
    { "id": "s2", "op": "idxmax", "input": "s1", "params": {} },
    { "id": "s3", "op": "max_value", "input": "s1", "params": {} }
  ],
  "final_step": ["s2", "s3"]
}

Example — "what's the least popular payment method, and how many times was it used?"
(same-metric case, via value_counts):
{
  "steps": [
    { "id": "s1", "op": "value_counts", "input": "df", "params": { "column": "Payment_Method" } },
    { "id": "s2", "op": "idxmin", "input": "s1", "params": {} },
    { "id": "s3", "op": "min_value", "input": "s1", "params": {} }
  ],
  "final_step": ["s2", "s3"]
}

Example — "which sales rep brought in the most revenue?" (also same-metric — simplest form):
{
  "steps": [
    { "id": "s1", "op": "groupby_agg", "input": "df", "params": { "group_by": ["Sales_Rep"], "metric": "Revenue", "agg": "sum" } },
    { "id": "s2", "op": "idxmax", "input": "s1", "params": {} },
    { "id": "s3", "op": "max_value", "input": "s1", "params": {} }
  ],
  "final_step": ["s2", "s3"]
}

Example — "which city had the highest total revenue, and who was the top rep there?"
(different-metric case for the second fact — filtering "df" is required here):
{
  "steps": [
    { "id": "s1", "op": "groupby_agg", "input": "df", "params": { "group_by": ["City"], "metric": "Revenue", "agg": "sum" } },
    { "id": "s2", "op": "idxmax", "input": "s1", "params": {} },
    { "id": "s3", "op": "max_value", "input": "s1", "params": {} },
    { "id": "s4", "op": "filter_eq", "input": "df", "params": { "column": "City", "value_from": "s2" } },
    { "id": "s5", "op": "groupby_agg", "input": "s4", "params": { "group_by": ["Sales_Rep"], "metric": "Revenue", "agg": "sum" } },
    { "id": "s6", "op": "idxmax", "input": "s5", "params": {} }
  ],
  "final_step": ["s2", "s3", "s6"]
}
Note "s4" filters "df" (not "s1", which is a series) — this is the pattern that previously broke.
`;

function validateSteps(parsed, columns) {
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Gemini returned no steps");
  }

  const seenIds = new Set(["df"]);

  for (const step of parsed.steps) {
    if (!step.id || seenIds.has(step.id)) {
      throw new Error(`Invalid or duplicate step id: ${step.id}`);
    }
    if (!VALID_OPS.includes(step.op)) {
      throw new Error(`Gemini returned an unknown op: ${step.op}`);
    }
    if (step.input !== "df" && !seenIds.has(step.input)) {
      throw new Error(
        `Step '${step.id}' references input '${step.input}' before it exists`,
      );
    }

    const params = step.params || {};
    for (const key of ["column", "metric"]) {
      if (params[key] && !columns.includes(params[key])) {
        throw new Error(`Gemini referenced unknown column: ${params[key]}`);
      }
    }
    if (params.group_by) {
      for (const col of params.group_by) {
        if (!columns.includes(col)) {
          throw new Error(`Gemini referenced unknown column: ${col}`);
        }
      }
    }
    if (params.agg && !VALID_AGGS.includes(params.agg)) {
      throw new Error(`Gemini returned an unknown agg: ${params.agg}`);
    }

    seenIds.add(step.id);
  }
  const finalSteps = Array.isArray(parsed.final_step)
    ? parsed.final_step
    : [parsed.final_step];
  for (const fid of finalSteps) {
    if (!seenIds.has(fid)) {
      throw new Error(`final_step '${fid}' was never produced`);
    }
  }
}

async function generateQuery(userMessage, columns) {
  const prompt = `Columns available: ${JSON.stringify(columns)}\nUser question: "${userMessage}"`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    },
  });

  const parsed = JSON.parse(response.text);

  validateSteps(parsed, columns);

  return parsed;
}

module.exports = { generateQuery };
