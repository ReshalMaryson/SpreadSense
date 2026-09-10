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

function validateQueryShape(parsed, columns) {
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Gemini returned no steps for a query-type response");
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
  if (Array.isArray(parsed.final_step)) {
    if (!parsed.final_labels || typeof parsed.final_labels !== "object") {
      throw new Error(
        "Compound final_step requires final_labels, none were provided",
      );
    }
    for (const fid of finalSteps) {
      if (
        !parsed.final_labels[fid] ||
        typeof parsed.final_labels[fid] !== "string"
      ) {
        throw new Error(`final_labels missing a label for step '${fid}'`);
      }
    }
  }
}

function validateResponse(parsed, columns) {
  if (parsed.type === "conversation") {
    if (!parsed.reply || typeof parsed.reply !== "string") {
      throw new Error(
        "Conversation-type response missing a valid 'reply' string",
      );
    }
    return;
  }
  if (parsed.type === "query") {
    validateQueryShape(parsed, columns);
    return;
  }
  throw new Error(`Unknown response type: ${parsed.type}`);
}

async function generateQuery(userMessage, columns, history = []) {
  const schemaBlock = `Columns available: ${JSON.stringify(columns)}`;

  const contents = [
    { role: "user", parts: [{ text: schemaBlock }] },
    { role: "model", parts: [{ text: "Understood, I have the schema." }] },
    ...history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  if (!process.env.QUERY_GENERATION_RULES) {
    throw new Error(
      "QUERY_GENERATION_RULES env var is not set — required in every environment.",
    );
  }

  const SYSTEM_INSTRUCTION = process.env.QUERY_GENERATION_RULES.replace(
    /\\n/g,
    "\n",
  );
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
    },
  });

  const parsed = JSON.parse(response.text);

  validateResponse(parsed, columns);

  return parsed;
}

module.exports = { generateQuery };
