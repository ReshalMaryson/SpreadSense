const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function validateCorrespondence(inputItems, outputItems) {
  if (!Array.isArray(outputItems) || outputItems.length !== inputItems.length) {
    throw new Error(
      `Humanize returned ${outputItems?.length ?? 0} items, expected ${inputItems.length}`,
    );
  }

  const inputTopics = inputItems.map((i) => i.topic);
  const outputTopics = outputItems.map((i) => i.topic);

  for (const topic of inputTopics) {
    if (!outputTopics.includes(topic)) {
      throw new Error(`Humanize dropped or renamed topic: '${topic}'`);
    }
  }
  for (const topic of outputTopics) {
    if (!inputTopics.includes(topic)) {
      throw new Error(`Humanize invented an untracked topic: '${topic}'`);
    }
  }
}

if (!process.env.INSIGHTS_HUMANIZE_RULES) {
  throw new Error(
    "INSIGHTS_HUMANIZE_RULES env var is not set — required in every environment.",
  );
}

const SYSTEM_INSTRUCTION = process.env.INSIGHTS_HUMANIZE_RULES.replace(
  /\\n/g,
  "\n",
);

async function humanizeInsights(items) {
  const prompt = JSON.stringify(items);

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          insights: {
            type: "array",
            items: {
              type: "object",
              properties: {
                topic: { type: "string" },
                title: { type: "string" },
                finding: { type: "string" },
              },
              required: ["topic", "title", "finding"],
            },
          },
        },
        required: ["insights"],
      },
    },
  });

  const parsed = JSON.parse(response.text);
  const insights = parsed.insights;

  validateCorrespondence(items, insights);
  return insights.map(({ topic, ...rest }) => rest);
}

module.exports = { humanizeInsights };
