const { generateInsightQueries } = require("./insightsQueryService");
const { humanizeInsights } = require("./insightsHumanizeService");

const QUERY_ENGINE_URL =
  process.env.QUERY_ENGINE_URL || "http://localhost:8000";

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
    usage: null,
  };
}

module.exports = { generateInsights };
