const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (!process.env.HUMANIZE_ENGINE_RESPONSE_RULES) {
  throw new Error(
    "HUMANIZE_ENGINE_RESPONSE_RULES env var is not set — required in every environment.",
  );
}

const SYSTEM_INSTRUCTION = process.env.HUMANIZE_ENGINE_RESPONSE_RULES.replace(
  /\\n/g,
  "\n",
);

async function humanizeResult(userMessage, engineResult) {
  const prompt = `User question: "${userMessage}"\nComputed result: ${JSON.stringify(engineResult)}`;

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });

  return response.text.trim();
}

module.exports = { humanizeResult };
