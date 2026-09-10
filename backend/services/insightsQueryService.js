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
  const SYSTEM_INSTRUCTION =
    process.env.INSIGHTS_QUERY_GENERATION_RULES.replace(/\\n/g, "\n");

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
