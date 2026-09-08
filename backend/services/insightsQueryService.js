const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const VALID_OPS = [
  "groupby_agg",
  "aggregate",
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
You are given a spreadsheet's column names and data types — NOT the actual data.
Your job is to propose a set of distinct, worthwhile query chains that, once run
against the real data, will surface interesting facts worth showing as
"insights" (like: top performer, a spread/distribution fact, a frequency fact,
a category breakdown, a comparison).

You never write code — only the whitelisted JSON step shape below, same as a
normal query.

Return ONLY a JSON object:
{
  "queries": [
    {
      "topic": "<short internal label for what this reveals, e.g. 'top product by revenue'>",
      "steps": [ { "id": "s1", "op": "<op name>", "input": "df", "params": { ... } } ],
      "final_step": "<id or list of ids>"
    }
  ]
}

Whitelisted ops and their params (identical to normal chat queries):
- groupby_agg: { "group_by": ["<column>"], "metric": "<column>", "agg": "sum|mean|count|min|max|median|nunique" } -> series
- aggregate: { "column": "<column>", "agg": "sum|mean|count|min|max|median|nunique" } -> scalar (a
  SINGLE dataset-wide number, e.g. "average rating across all books". Use this — NEVER
  groupby_agg — whenever there is no natural grouping dimension for the fact. groupby_agg requires
  a non-empty group_by and will crash if you try to force one where none belongs.
- filter_eq: { "column": "<column>", "value": <literal> } or { "column": "<column>", "value_from": "<step id>" } -> dataframe
- filter_isin: { "column": "<column>", "values": [<literal>, ...] } -> dataframe
- filter_cmp: { "column": "<column>", "operator": "gt|gte|lt|lte", "value": <number> } -> dataframe
- sort_values: { "column": "<column>", "ascending": true|false } -> dataframe
- top_n: { "column": "<column>", "n": <int>, "ascending": true|false } -> dataframe
- idxmax / idxmin: {} (input must be a series) -> scalar (entity name)
- max_value / min_value: {} (input must be a series) -> scalar (the value at that ranked key — use
  this instead of get_value when the number is the SAME metric you ranked by)
- value_counts: { "column": "<column>" } -> series
- count_rows: {} -> scalar
- get_value: { "column": "<column>" } on a filtered single-row dataframe, or omit "column" on a
  single-value series -> scalar (only for a DIFFERENT metric than what you ranked by)
- filter_eq/filter_isin/filter_cmp only ever take "df" or another filtered-dataframe step as
  input — never a groupby_agg/value_counts output (that's a series).

Rules:
- Only use column names from the provided list, copied exactly, including case.
- Propose exactly {{INSIGHT_COUNT}} queries.
- Each query must reveal a DISTINCT fact — no two queries should surface the same underlying
  finding through different phrasing (e.g. "top product by quantity" and "top product by units
  sold" are the same fact — pick one).
- Prefer variety across angles: a top/bottom performer, a category-level breakdown, a
  frequency/count fact, a spread or comparison across groups. Don't make every query the same
  "top X by Y" shape.
- Whenever an idxmax/idxmin's identity matters, keep its step id in final_step alongside any
  number step — never drop the name for just the number, same as normal chat rules.
- Keep each chain as short as possible while still fully answering its own topic.
- Return nothing except the JSON object. No prose, no markdown, no code fences.
`;

function validateQueryChain(query, columns) {
  if (!Array.isArray(query.steps) || query.steps.length === 0) {
    throw new Error(`Query '${query.topic}' has no steps`);
  }

  const seenIds = new Set(["df"]);

  for (const step of query.steps) {
    if (!step.id || seenIds.has(step.id)) {
      throw new Error(
        `Invalid or duplicate step id in '${query.topic}': ${step.id}`,
      );
    }
    if (!VALID_OPS.includes(step.op)) {
      throw new Error(`Unknown op in '${query.topic}': ${step.op}`);
    }
    if (step.input !== "df" && !seenIds.has(step.input)) {
      throw new Error(
        `Step '${step.id}' in '${query.topic}' references input before it exists`,
      );
    }

    const params = step.params || {};
    for (const key of ["column", "metric"]) {
      if (params[key] && !columns.includes(params[key])) {
        throw new Error(`Unknown column in '${query.topic}': ${params[key]}`);
      }
    }
    if (params.group_by) {
      for (const col of params.group_by) {
        if (!columns.includes(col)) {
          throw new Error(`Unknown column in '${query.topic}': ${col}`);
        }
      }
    }
    if (params.agg && !VALID_AGGS.includes(params.agg)) {
      throw new Error(`Unknown agg in '${query.topic}': ${params.agg}`);
    }

    seenIds.add(step.id);
  }

  const finalSteps = Array.isArray(query.final_step)
    ? query.final_step
    : [query.final_step];
  for (const fid of finalSteps) {
    if (!seenIds.has(fid)) {
      throw new Error(
        `final_step '${fid}' in '${query.topic}' was never produced`,
      );
    }
  }
}

async function generateInsightQueries(columns, insightCount) {
  const prompt = `Columns available: ${JSON.stringify(columns)}`;
  const systemInstruction = SYSTEM_INSTRUCTION.replace(
    "{{INSIGHT_COUNT}}",
    insightCount,
  );

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  const parsed = JSON.parse(response.text);

  if (!Array.isArray(parsed.queries) || parsed.queries.length === 0) {
    throw new Error("Gemini returned no insight queries");
  }

  const valid = [];
  for (const query of parsed.queries) {
    try {
      validateQueryChain(query, columns);
      valid.push(query);
    } catch (err) {
      console.error("Dropping invalid insight query:", err.message);
    }
  }

  if (valid.length === 0) {
    throw new Error("All proposed insight queries failed validation");
  }

  return valid;
}

module.exports = { generateInsightQueries };
