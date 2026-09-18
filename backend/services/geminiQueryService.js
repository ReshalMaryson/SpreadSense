const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const VALID_OPS = [
  "groupby_agg",
  "aggregate",
  "join",
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

function validateQueryShape(parsed, sheets) {
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Gemini returned no steps for a query-type response");
  }

  const sheetNames = Object.keys(sheets);
  const allColumns = Object.values(sheets).flat();
  const seenIds = new Set(sheetNames);

  for (const step of parsed.steps) {
    if (!step.id || seenIds.has(step.id)) {
      throw new Error(`Invalid or duplicate step id: ${step.id}`);
    }
    if (!VALID_OPS.includes(step.op)) {
      throw new Error(`Gemini returned an unknown op: ${step.op}`);
    }

    const params = step.params || {};

    if (step.op === "join") {
      if (!seenIds.has(params.left))
        throw new Error(`join 'left' references unknown input: ${params.left}`);
      if (!seenIds.has(params.right))
        throw new Error(
          `join 'right' references unknown input: ${params.right}`,
        );
    } else {
      if (!seenIds.has(step.input)) {
        throw new Error(
          `Step '${step.id}' references input '${step.input}' before it exists`,
        );
      }
    }

    for (const key of ["column", "metric", "on", "left_on", "right_on"]) {
      if (params[key] && !allColumns.includes(params[key])) {
        throw new Error(`Gemini referenced unknown column: ${params[key]}`);
      }
    }
    if (params.group_by) {
      for (const col of params.group_by) {
        if (!allColumns.includes(col))
          throw new Error(`Gemini referenced unknown column: ${col}`);
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
    if (!seenIds.has(fid))
      throw new Error(`final_step '${fid}' was never produced`);
  }

  if (Array.isArray(parsed.final_step)) {
    if (!parsed.final_labels)
      throw new Error("Compound final_step requires final_labels");
    for (const fid of finalSteps) {
      if (!parsed.final_labels[fid])
        throw new Error(`final_labels missing a label for step '${fid}'`);
    }
  }
}
function validateResponse(parsed, sheets) {
  if (parsed.type === "conversation") {
    if (!parsed.reply || typeof parsed.reply !== "string") {
      throw new Error(
        "Conversation-type response missing a valid 'reply' string",
      );
    }
    return;
  }
  if (parsed.type === "query") {
    validateQueryShape(parsed, sheets);
    return;
  }
  throw new Error(`Unknown response type: ${parsed.type}`);
}

async function generateQuery(userMessage, sheets, history = []) {
  const schemaBlock = `Sheets and their columns: ${JSON.stringify(sheets)}`;

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

  validateResponse(parsed, sheets);

  return parsed;
}

module.exports = { generateQuery };
