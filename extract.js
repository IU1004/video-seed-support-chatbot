require("dotenv").config();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractFields(systemPrompt, userInput) {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userInput },
    ],
    temperature: 0.3,
  });
  try {
    return JSON.parse(completion.choices[0].message.content);
  } catch {
    return {};
  }
}

module.exports = { extractFields }; 