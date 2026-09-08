const { generateInsightQueries } = require("./insightsQueryService");
const { humanizeInsights } = require("./insightsHumanizeService");

const QUERY_ENGINE_URL =
  process.env.QUERY_ENGINE_URL || "http://localhost:8000";

/**
 * Full insight pipeline, engine-backed instead of codeExecution:
 *   1. Get real column names from the query engine (cache-or-parse, same as chat).
 *   2. Ask Gemini to propose N distinct, whitelisted query chains from just the schema.
 *   3. Run each chain through /execute — same engine chat already uses.
 *   4. Humanize the executed results into {title, finding} pairs.
 *
 * Any single failed chain is skipped (logged), not fatal to the whole batch —
 * a bad proposal shouldn't take down every other insight.
 */
async function generateInsights(sheetId, csv, insightCount) {
  const columnsResponse = await fetch(`${QUERY_ENGINE_URL}/columns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheetId, csv }),
  });
  const { columns } = await columnsResponse.json();

  const queries = await generateInsightQueries(
    columns,
    insightCount < 500 ? 4 : 6,
  );

  ///////////
  console.log(
    "from insightsService, insight queries generated  and insight count:",
  );
  console.log(insightCount);
  console.log(queries);
  ///////////

  const executed = [];
  for (const query of queries) {
    const engineResponse = await fetch(`${QUERY_ENGINE_URL}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheetId,
        csv,
        steps: query.steps,
        final_step: query.final_step,
      }),
    });
    const engineResult = await engineResponse.json();

    if (engineResult.status === "error") {
      console.error(
        `Insight query '${query.topic}' failed to execute:`,
        engineResult.detail || engineResult.error,
      );
      continue;
    }

    executed.push({ topic: query.topic, result: engineResult.data });
  }

  if (executed.length === 0) {
    throw new Error("No insight queries executed successfully");
  }

  console.log(
    "Executed topics going into humanize:",
    executed.map((e) => e.topic),
  );
  const insights = await humanizeInsights(executed);
  console.log(
    "Insights coming out of humanize:",
    insights.length,
    insights.map((i) => i.title),
  );

  return {
    result: { insights },
    usage: null, // per-call token usage no longer tracked as a single Gemini call here
  };
}

module.exports = { generateInsights };
